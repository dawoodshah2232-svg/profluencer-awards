<?php

namespace Tests\Feature;

use App\Mail\VoteOtpMail;
use App\Models\Category;
use App\Models\Nominee;
use App\Models\Setting;
use App\Models\Vote;
use Database\Seeders\CategorySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class VotingFlowTest extends TestCase
{
    use RefreshDatabase;

    private Nominee $nominee;

    private Nominee $otherCategoryNominee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([CategorySeeder::class, SettingSeeder::class]);

        // Open the voting window around "now" for the tests.
        Setting::put('voting_start', now('Asia/Dubai')->subDay()->toDateString());
        Setting::put('voting_end', now('Asia/Dubai')->addDays(30)->toDateString());

        $category = Category::query()->first();
        $otherCategory = Category::query()->where('id', '!=', $category->id)->first();

        $this->nominee = Nominee::create([
            'category_id' => $category->id,
            'name' => 'Test Nominee',
            'status' => Nominee::STATUS_APPROVED,
        ]);

        $this->otherCategoryNominee = Nominee::create([
            'category_id' => $otherCategory->id,
            'name' => 'Other Category Nominee',
            'status' => Nominee::STATUS_APPROVED,
        ]);
    }

    private function votePayload(array $overrides = []): array
    {
        return array_merge([
            'nominee_id' => $this->nominee->id,
            'name' => 'Sara Ahmed',
            'email' => 'sara@example.com',
            'phone' => '+971501234567',
        ], $overrides);
    }

    private function castVote(array $overrides = []): array
    {
        $code = null;

        Mail::fake();
        $response = $this->postJson('/api/v1/votes', $this->votePayload($overrides));

        Mail::assertSent(VoteOtpMail::class, function (VoteOtpMail $mail) use (&$code): bool {
            $code = $mail->code;

            return true;
        });

        return [$response, $code];
    }

    public function test_vote_creates_held_vote_and_sends_otp(): void
    {
        [$response, $code] = $this->castVote();

        $response->assertCreated();
        $this->assertNotNull($code);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        $vote = Vote::first();
        $this->assertSame(Vote::STATUS_HELD, $vote->status);
        $this->assertNotNull($vote->otp_hash);
        // Only the hash is stored — never the plain code.
        $this->assertNotSame($code, $vote->otp_hash);
    }

    public function test_verify_with_correct_code_counts_the_vote(): void
    {
        [$response, $code] = $this->castVote();
        $voteId = $response->json('data.id');

        $verify = $this->postJson('/api/v1/votes/verify', [
            'vote_id' => $voteId,
            'code' => $code,
        ]);

        $verify->assertOk();
        $this->assertSame(Vote::STATUS_COUNTED, Vote::find($voteId)->status);
        $this->assertSame(1, $this->nominee->fresh()->votes_count);
    }

    public function test_wrong_code_is_rejected_and_attempts_increment(): void
    {
        [$response] = $this->castVote();
        $voteId = $response->json('data.id');

        $verify = $this->postJson('/api/v1/votes/verify', [
            'vote_id' => $voteId,
            'code' => '000000',
        ]);

        $verify->assertStatus(422)->assertJsonPath('code', 'INVALID_CODE');
        $this->assertSame(1, Vote::find($voteId)->otp_attempts);
        $this->assertSame(Vote::STATUS_HELD, Vote::find($voteId)->status);
    }

    public function test_expired_code_is_rejected(): void
    {
        [$response] = $this->castVote();
        $vote = Vote::find($response->json('data.id'));
        $vote->forceFill(['otp_expires_at' => now()->subMinute()])->save();

        $verify = $this->postJson('/api/v1/votes/verify', [
            'vote_id' => $vote->id,
            'code' => '123456',
        ]);

        $verify->assertStatus(422)->assertJsonPath('code', 'OTP_EXPIRED');
    }

    public function test_duplicate_email_blocked_in_same_category(): void
    {
        [$first, $code] = $this->castVote();
        $this->postJson('/api/v1/votes/verify', [
            'vote_id' => $first->json('data.id'),
            'code' => $code,
        ])->assertOk();

        // Same email, different phone, same category -> blocked.
        $retry = $this->postJson('/api/v1/votes', $this->votePayload([
            'phone' => '+971509876543',
        ]));

        $retry->assertStatus(409)->assertJsonPath('code', 'ALREADY_VOTED');
    }

    public function test_duplicate_phone_blocked_in_same_category(): void
    {
        [$first, $code] = $this->castVote();
        $this->postJson('/api/v1/votes/verify', [
            'vote_id' => $first->json('data.id'),
            'code' => $code,
        ])->assertOk();

        // Same phone in a different format, different email -> blocked.
        $retry = $this->postJson('/api/v1/votes', $this->votePayload([
            'email' => 'other@example.com',
            'phone' => '0501234567',
        ]));

        $retry->assertStatus(409)->assertJsonPath('code', 'ALREADY_VOTED');
    }

    public function test_same_voter_may_vote_in_another_category(): void
    {
        [$first, $code] = $this->castVote();
        $this->postJson('/api/v1/votes/verify', [
            'vote_id' => $first->json('data.id'),
            'code' => $code,
        ])->assertOk();

        $second = $this->postJson('/api/v1/votes', $this->votePayload([
            'nominee_id' => $this->otherCategoryNominee->id,
        ]));

        $second->assertCreated();
    }

    public function test_idempotency_key_replays_without_duplicating(): void
    {
        Mail::fake();

        $first = $this->postJson('/api/v1/votes', $this->votePayload(), [
            'Idempotency-Key' => 'test-key-123',
        ]);
        $first->assertCreated();
        $firstId = $first->json('data.id');

        // Retried request with the same key returns the original vote.
        $replay = $this->postJson('/api/v1/votes', $this->votePayload(), [
            'Idempotency-Key' => 'test-key-123',
        ]);

        $replay->assertOk()->assertJsonPath('data.id', $firstId);
        $this->assertSame(1, Vote::count());
    }

    public function test_voting_closed_outside_window(): void
    {
        Setting::put('voting_start', now('Asia/Dubai')->addDay()->toDateString());
        Setting::put('voting_end', now('Asia/Dubai')->addDays(30)->toDateString());

        Mail::fake();
        $response = $this->postJson('/api/v1/votes', $this->votePayload());

        $response->assertStatus(403)->assertJsonPath('code', 'VOTING_CLOSED');
    }
}
