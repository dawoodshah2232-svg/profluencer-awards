<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\VoteResource;
use App\Models\Vote;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Vote ledger administration. Votes are immutable: the only fraud control
 * is `invalidated` with a mandatory reason (rows are never deleted).
 */
class VoteAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Vote::query()->with(['voter', 'nominee', 'category'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('nominee_id')) {
            $query->where('nominee_id', $request->integer('nominee_id'));
        }

        return VoteResource::collection($query->paginate(50))->response();
    }

    public function show(Vote $vote): JsonResponse
    {
        return response()->json(['data' => new VoteResource($vote->load(['voter', 'nominee', 'category']))]);
    }

    public function invalidate(Request $request, Vote $vote): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:255'],
        ]);

        if ($vote->status === Vote::STATUS_INVALIDATED) {
            return response()->json(['message' => 'This vote is already invalidated.'], 422);
        }

        DB::transaction(function () use ($vote, $validated, $request): void {
            $wasCounted = $vote->isCounted();

            $vote->forceFill([
                'status' => Vote::STATUS_INVALIDATED,
                'invalidated_reason' => $validated['reason'],
                'otp_hash' => null,
            ])->save();

            if ($wasCounted) {
                $vote->nominee()->decrement('votes_count');
            }

            AuditLogger::log('admin', $request->user(), 'vote.invalidated', $vote, [
                'reason' => $validated['reason'],
                'was_counted' => $wasCounted,
                'nominee_id' => $vote->nominee_id,
                'category_id' => $vote->category_id,
            ]);
        });

        return response()->json([
            'data' => new VoteResource($vote->fresh()->load(['voter', 'nominee', 'category'])),
            'message' => 'Vote invalidated. The row is retained for audit.',
        ]);
    }
}
