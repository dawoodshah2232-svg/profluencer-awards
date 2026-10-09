<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Nominee;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AccountAndReviewTest extends TestCase
{
    use RefreshDatabase;

    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CategorySeeder::class, SettingSeeder::class]);

        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => Hash::make('Secret123'), 'role' => User::ROLE_SUPER_ADMIN]);
        $this->adminToken = $admin->createToken('admin', [$admin->role])->plainTextToken;
    }

    /** Each real HTTP request starts unauthenticated; the test client caches the last user. */
    private function fresh(): static
    {
        $this->app['auth']->forgetGuards();

        return $this;
    }

    private function register(string $email = 'creator@example.com'): array
    {
        return $this->postJson('/api/v1/auth/register', [
            'name' => 'Real Creator',
            'display_name' => 'Real Creator',
            'email' => $email,
            'password' => 'Secret123',
            'category_id' => Category::query()->value('id'),
            'profile_url' => 'https://instagram.com/realcreator',
            'followers' => '120K',
        ])->assertCreated()->json('data');
    }

    public function test_registration_creates_a_pending_nominee_hidden_from_the_public(): void
    {
        $data = $this->register();
        $nomineeId = $data['user']['nominee']['id'];

        $this->assertSame('pending', $data['user']['nominee']['status']);
        $this->getJson("/api/v1/nominees/{$nomineeId}")->assertNotFound();
    }

    public function test_approval_requires_every_verification_check(): void
    {
        $nomineeId = $this->register()['user']['nominee']['id'];
        $auth = ['Authorization' => "Bearer {$this->adminToken}"];

        $this->postJson("/api/v1/admin/nominees/{$nomineeId}/review", [
            'decision' => 'approved',
            'checks' => ['profile_link' => true, 'identity' => true],
        ], $auth)->assertStatus(422)->assertJsonPath('code', 'VERIFICATION_INCOMPLETE');

        $this->postJson("/api/v1/admin/nominees/{$nomineeId}/review", [
            'decision' => 'approved',
            'checks' => array_fill_keys(['profile_link', 'identity', 'audience', 'category_fit', 'no_duplicate'], true),
        ], $auth)->assertOk()->assertJsonPath('data.status', 'approved');

        $this->fresh()->getJson("/api/v1/nominees/{$nomineeId}")->assertOk()->assertJsonMissingPath('data.review_notes');
    }

    public function test_nominee_sees_review_notes_and_can_resubmit_until_approved(): void
    {
        $data = $this->register();
        $nomineeId = $data['user']['nominee']['id'];
        $creator = ['Authorization' => "Bearer {$data['token']}"];

        $this->postJson("/api/v1/admin/nominees/{$nomineeId}/review", [
            'decision' => 'changes_requested', 'notes' => 'Add your handle',
        ], ['Authorization' => "Bearer {$this->adminToken}"])->assertOk();

        $this->fresh()->getJson('/api/v1/auth/me', $creator)->assertJsonPath('data.nominee.review_notes', 'Add your handle');

        $this->fresh()->patchJson('/api/v1/influencer/profile', ['handle' => '@real'], $creator)
            ->assertOk()->assertJsonPath('data.status', 'pending');

        Nominee::query()->whereKey($nomineeId)->update(['status' => 'approved']);
        $this->fresh()->patchJson('/api/v1/influencer/profile', ['bio' => 'x'], $creator)->assertStatus(409);
    }

    public function test_password_reset_round_trip(): void
    {
        Notification::fake();
        $this->register();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'creator@example.com'])->assertOk();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])->assertOk();

        $token = null;
        Notification::assertSentTo(User::query()->where('email', 'creator@example.com')->first(), ResetPassword::class,
            function (ResetPassword $n) use (&$token): bool { $token = $n->token; return true; });

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'creator@example.com', 'token' => 'wrong', 'password' => 'NewSecret1', 'password_confirmation' => 'NewSecret1',
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'creator@example.com', 'token' => $token, 'password' => 'NewSecret1', 'password_confirmation' => 'NewSecret1',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', ['email' => 'creator@example.com', 'password' => 'NewSecret1'])->assertOk();
    }

    public function test_google_sign_in_is_rejected_when_not_configured(): void
    {
        $this->postJson('/api/v1/auth/google', ['credential' => 'not-a-token'])
            ->assertStatus(422)->assertJsonPath('code', 'GOOGLE_INVALID');
    }

    public function test_leaderboard_hides_votes_until_voting_opens(): void
    {
        Setting::put('voting_start', now('Asia/Dubai')->addDays(5)->toDateString());
        Nominee::create(['category_id' => Category::query()->value('id'), 'name' => 'Approved One', 'status' => 'approved', 'votes_count' => 7]);

        $this->getJson('/api/v1/leaderboard')->assertOk()
            ->assertJsonPath('data.visible', false)
            ->assertJsonPath('data.categories.0.nominees.0.votes_count', null);
    }

    public function test_admin_confirmed_winner_order_is_published(): void
    {
        $catId = Category::query()->value('id');
        $a = Nominee::create(['category_id' => $catId, 'name' => 'Most Votes', 'status' => 'approved', 'votes_count' => 10]);
        $b = Nominee::create(['category_id' => $catId, 'name' => 'Fewer Votes', 'status' => 'approved', 'votes_count' => 3]);

        $this->postJson('/api/v1/admin/results/publish', ['selections' => [$catId => [$b->id, $a->id]]],
            ['Authorization' => "Bearer {$this->adminToken}"])->assertCreated();

        $this->getJson('/api/v1/leaderboard')->assertOk()
            ->assertJsonPath('data.visible', true)
            ->assertJsonPath('data.categories.0.nominees.0.name', 'Fewer Votes')
            ->assertJsonPath('data.categories.0.nominees.0.award', 'Category Winner');
    }
}
