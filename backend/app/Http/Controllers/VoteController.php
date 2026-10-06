<?php

namespace App\Http\Controllers;

use App\Http\Resources\VoteResource;
use App\Jobs\SendVoteOtp;
use App\Models\Nominee;
use App\Models\Setting;
use App\Models\Vote;
use App\Models\Voter;
use App\Services\AuditLogger;
use App\Services\OtpService;
use App\Services\PhoneNormalizer;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Public voting endpoints.
 *
 * Integrity rules (enforced here AND at the database level):
 *  - one counted/held vote per (voter_id, category_id) — unique index
 *  - email OR phone identifies the voter — both unique on voters
 *  - a vote only counts after the email OTP is verified (held -> counted)
 *  - unverified votes never count; fraud -> invalidated (never deleted)
 */
class VoteController extends Controller
{
    /**
     * Cast a vote. Creates the vote as `held` and emails a one-time code.
     * Idempotent via the `Idempotency-Key` request header.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nominee_id' => ['required', 'integer', 'exists:nominees,id'],
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'phone' => ['required', 'string', 'min:7', 'max:25'],
        ]);

        if (! Setting::votingIsOpen()) {
            return response()->json([
                'message' => 'Voting is not open right now.',
                'code' => 'VOTING_CLOSED',
            ], 403);
        }

        $nominee = Nominee::query()->findOrFail($validated['nominee_id']);

        if ($nominee->status !== Nominee::STATUS_APPROVED) {
            return response()->json([
                'message' => 'This nominee is not approved for voting.',
                'code' => 'NOMINEE_NOT_APPROVED',
            ], 422);
        }

        // Idempotency: a retried request with the same key returns the
        // original vote instead of creating a second one.
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($idempotencyKey) {
            $existing = Vote::query()->where('idempotency_key', $idempotencyKey)->first();
            if ($existing !== null) {
                return response()->json([
                    'data' => new VoteResource($existing->load(['nominee', 'category'])),
                    'message' => 'Vote already recorded.',
                ], 200);
            }
        }

        $email = mb_strtolower(trim($validated['email']));
        $phoneNormalized = PhoneNormalizer::normalize($validated['phone']);

        if ($phoneNormalized === '') {
            return response()->json([
                'message' => 'The phone number is not valid.',
                'code' => 'INVALID_PHONE',
            ], 422);
        }

        $voter = Voter::findByIdentity($email, $validated['phone'])
            ?? Voter::create([
                'name' => trim($validated['name']),
                'email' => $email,
                'phone_normalized' => $phoneNormalized,
                'phone_display' => PhoneNormalizer::display($validated['phone']),
            ]);

        // Keep the stored name fresh, but never change identity fields here.
        if ($voter->name !== trim($validated['name'])) {
            $voter->update(['name' => trim($validated['name'])]);
        }

        $previousVote = Vote::query()
            ->where('voter_id', $voter->id)
            ->where('category_id', $nominee->category_id)
            ->first();

        if ($previousVote !== null) {
            if ($previousVote->isCounted()) {
                AuditLogger::log('voter', null, 'vote.duplicate_blocked', $previousVote, [
                    'reason' => 'already_counted',
                    'category_id' => $nominee->category_id,
                ]);

                return response()->json([
                    'message' => 'You have already voted in this category.',
                    'code' => 'ALREADY_VOTED',
                ], 409);
            }

            if ($previousVote->status === Vote::STATUS_INVALIDATED) {
                return response()->json([
                    'message' => 'A previous vote in this category was invalidated and cannot be recast.',
                    'code' => 'VOTE_INVALIDATED',
                ], 409);
            }

            // A held vote exists: refresh its OTP instead of creating a row.
            $code = OtpService::issueFor($previousVote);
            SendVoteOtp::dispatch($previousVote->id, $code);

            return response()->json([
                'data' => new VoteResource($previousVote->load(['nominee', 'category'])),
                'message' => 'A new verification code was sent to your email.',
            ], 200);
        }

        try {
            $vote = DB::transaction(function () use ($voter, $nominee, $request, $idempotencyKey): Vote {
                return Vote::create([
                    'voter_id' => $voter->id,
                    'nominee_id' => $nominee->id,
                    'category_id' => $nominee->category_id,
                    'status' => Vote::STATUS_HELD,
                    'ip_hash' => hash('sha256', $request->ip() ?? ''),
                    'user_agent' => substr($request->userAgent() ?? '', 0, 255),
                    'idempotency_key' => $idempotencyKey,
                ]);
            });
        } catch (QueryException $e) {
            // Race: two concurrent requests for the same voter+category.
            // The unique index rejected the second — treat as a duplicate.
            if ($e->getCode() === '23000') {
                AuditLogger::log('voter', null, 'vote.duplicate_blocked', null, [
                    'reason' => 'race_unique_violation',
                    'voter_id' => $voter->id,
                    'category_id' => $nominee->category_id,
                ]);

                return response()->json([
                    'message' => 'You have already voted in this category.',
                    'code' => 'ALREADY_VOTED',
                ], 409);
            }

            throw $e;
        }

        $code = OtpService::issueFor($vote);
        SendVoteOtp::dispatch($vote->id, $code);

        AuditLogger::log('voter', null, 'vote.created', $vote, [
            'nominee_id' => $nominee->id,
            'category_id' => $nominee->category_id,
        ]);

        return response()->json([
            'data' => new VoteResource($vote->load(['nominee', 'category'])),
            'message' => 'Vote recorded. Enter the verification code sent to your email to count it.',
        ], 201);
    }

    /**
     * Verify the email OTP. On success the vote becomes `counted`.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vote_id' => ['required', 'integer', 'exists:votes,id'],
            'code' => ['required', 'string', 'min:4', 'max:10'],
        ]);

        $vote = Vote::with(['voter', 'nominee', 'category'])->findOrFail($validated['vote_id']);

        if ($vote->isCounted()) {
            return response()->json([
                'data' => new VoteResource($vote),
                'message' => 'This vote is already counted.',
            ], 200);
        }

        if ($vote->status === Vote::STATUS_INVALIDATED) {
            return response()->json([
                'message' => 'This vote was invalidated.',
                'code' => 'VOTE_INVALIDATED',
            ], 410);
        }

        if ($vote->otpExpired()) {
            return response()->json([
                'message' => 'The code has expired. Please request a new one.',
                'code' => 'OTP_EXPIRED',
            ], 422);
        }

        if (OtpService::attemptsExhausted($vote)) {
            return response()->json([
                'message' => 'Too many wrong attempts. Please request a new code.',
                'code' => 'OTP_ATTEMPTS_EXHAUSTED',
            ], 422);
        }

        if (! OtpService::verify($vote, $validated['code'])) {
            $remaining = OtpService::maxAttempts() - $vote->fresh()->otp_attempts;

            return response()->json([
                'message' => 'The code is incorrect.',
                'code' => 'INVALID_CODE',
                'attempts_remaining' => max($remaining, 0),
            ], 422);
        }

        DB::transaction(function () use ($vote): void {
            $vote->forceFill([
                'status' => Vote::STATUS_COUNTED,
                'otp_hash' => null, // the secret has served its purpose
            ])->save();

            $vote->nominee()->increment('votes_count');

            if ($vote->voter->verified_at === null) {
                $vote->voter->forceFill(['verified_at' => now()])->save();
            }
        });

        AuditLogger::log('voter', null, 'vote.counted', $vote->fresh(), [
            'nominee_id' => $vote->nominee_id,
            'category_id' => $vote->category_id,
        ]);

        return response()->json([
            'data' => new VoteResource($vote->fresh()->load(['nominee', 'category'])),
            'message' => 'Thank you! Your vote has been counted.',
        ], 200);
    }

    /**
     * Resend the OTP for a held vote (cooldown enforced).
     */
    public function resend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vote_id' => ['required', 'integer', 'exists:votes,id'],
        ]);

        $vote = Vote::with(['voter', 'nominee', 'category'])->findOrFail($validated['vote_id']);

        if (! $vote->isHeld()) {
            return response()->json([
                'message' => 'Only a pending vote can be re-verified.',
                'code' => 'VOTE_NOT_HELD',
            ], 422);
        }

        $cooldown = (int) config('voting.otp_resend_cooldown_seconds', 60);
        $issuedAt = $vote->otp_expires_at?->copy()->subMinutes(OtpService::ttlMinutes());

        if ($issuedAt !== null && $issuedAt->addSeconds($cooldown)->isFuture()) {
            return response()->json([
                'message' => 'Please wait a moment before requesting a new code.',
                'code' => 'RESEND_COOLDOWN',
                'retry_after_seconds' => (int) $issuedAt->diffInSeconds(now()),
            ], 429);
        }

        $code = OtpService::issueFor($vote);
        SendVoteOtp::dispatch($vote->id, $code);

        return response()->json([
            'data' => new VoteResource($vote->fresh()->load(['nominee', 'category'])),
            'message' => 'A new verification code was sent to your email.',
        ], 200);
    }
}
