<?php

namespace Tests\Feature;

use App\Mail\TemplateMail;
use App\Models\Category;
use App\Models\EmailCampaign;
use App\Models\EmailSuppression;
use App\Models\EmailTemplate;
use App\Models\InfluencerAccount;
use App\Models\Nominee;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\EmailTemplateSeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailModuleTest extends TestCase
{
    use RefreshDatabase;

    private array $auth;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CategorySeeder::class, SettingSeeder::class, EmailTemplateSeeder::class]);
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => Hash::make('Secret123'), 'role' => User::ROLE_SUPER_ADMIN]);
        $this->auth = ['Authorization' => 'Bearer '.$admin->createToken('admin', [$admin->role])->plainTextToken];
    }

    private function fresh(): static
    {
        $this->app['auth']->forgetGuards();

        return $this;
    }

    public function test_mail_secrets_are_encrypted_and_never_returned(): void
    {
        $this->putJson('/api/v1/admin/mail-settings', [
            'driver' => 'brevo', 'brevo_api_key' => 'xkeysib-secret-value-9876', 'from_address' => 'noreply@example.com',
        ], $this->auth)->assertOk()->assertJsonPath('data.brevo_api_key_set', true)->assertJsonPath('data.brevo_api_key_hint', '…9876');

        $this->assertStringNotContainsString('xkeysib-secret', (string) \App\Models\Setting::query()->where('key', 'mail_brevo_api_key')->value('value'));
        $this->fresh()->getJson('/api/v1/admin/mail-settings', $this->auth)->assertJsonMissingPath('data.brevo_api_key');
        $this->assertStringNotContainsString('mail_brevo_api_key', $this->fresh()->getJson('/api/v1/admin/settings', $this->auth)->getContent());
        $this->assertSame('brevo', config('mail.default'));
    }

    public function test_preview_renders_layout_with_logo_and_placeholders(): void
    {
        $id = EmailTemplate::query()->where('key', 'nomination_approved')->value('id');
        $html = $this->postJson('/api/v1/admin/email-templates/preview', ['id' => $id], $this->auth)->assertOk()->json('data.html');

        $this->assertStringContainsString('/img/logo-clean.png', $html);
        $this->assertStringContainsString('Congratulations', $html);
        $this->assertStringNotContainsString('{{', $html);
    }

    public function test_system_templates_cannot_be_deleted(): void
    {
        $id = EmailTemplate::query()->where('key', 'vote_otp')->value('id');
        $this->deleteJson("/api/v1/admin/email-templates/{$id}", [], $this->auth)->assertStatus(422);
    }

    public function test_campaign_sends_to_audience_skipping_unsubscribed_and_tracks_opens(): void
    {
        Mail::fake();
        EmailSuppression::create(['email' => 'gone@example.com']);
        $tpl = EmailTemplate::query()->where('key', 'campaign_newsletter')->value('id');

        $id = $this->postJson('/api/v1/admin/campaigns', [
            'name' => 'Test', 'template_id' => $tpl, 'audience' => 'custom',
            'custom_emails' => "a@example.com, gone@example.com\nnot-an-email, a@example.com",
        ], $this->auth)->assertCreated()->json('data.id');

        $this->fresh()->postJson("/api/v1/admin/campaigns/{$id}/send", [], $this->auth)
            ->assertOk()->assertJsonPath('pending', 0)->assertJsonPath('data.status', 'sent')->assertJsonPath('data.total', 1);
        Mail::assertSent(TemplateMail::class, 1);

        $token = EmailCampaign::query()->find($id)->recipients()->value('token');
        $this->get("/api/v1/e/o/{$token}.gif")->assertOk()->assertHeader('Content-Type', 'image/gif');
        $this->assertNotNull(EmailCampaign::query()->find($id)->recipients()->value('opened_at'));

        $this->get("/api/v1/e/u/{$token}")->assertOk();
        $this->assertTrue(EmailSuppression::isSuppressed('a@example.com'));
    }

    public function test_approving_a_nomination_emails_the_nominee(): void
    {
        Mail::fake();
        $user = User::create(['name' => 'Creator One', 'email' => 'creator@example.com', 'password' => Hash::make('Secret123'), 'role' => User::ROLE_INFLUENCER]);
        $nominee = Nominee::create(['category_id' => Category::query()->orderBy('sort_order')->value('id'), 'name' => 'Creator One', 'status' => 'pending']);
        InfluencerAccount::create(['user_id' => $user->id, 'nominee_id' => $nominee->id]);

        $this->postJson("/api/v1/admin/nominees/{$nominee->id}/review", [
            'decision' => 'approved',
            'checks' => array_fill_keys(['profile_link', 'identity', 'audience', 'category_fit', 'no_duplicate'], true),
        ], $this->auth)->assertOk();

        Mail::assertSent(TemplateMail::class, fn (TemplateMail $m) => $m->templateKey === 'nomination_approved' && $m->hasTo('creator@example.com'));
    }
}
