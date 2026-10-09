<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Email module: branded templates (header / hero / content / footer),
     * campaigns sent to an audience, per-recipient delivery + open tracking,
     * and an unsubscribe (suppression) list.
     */
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 60)->nullable()->unique(); // system templates are looked up by key
            $table->string('name', 150);
            $table->string('category', 20)->default('campaign'); // system | campaign
            $table->string('subject', 255);
            $table->string('preheader', 255)->nullable();
            $table->string('hero_eyebrow', 120)->nullable();
            $table->string('hero_title', 255)->nullable();
            $table->text('hero_subtitle')->nullable();
            $table->string('hero_image_url')->nullable();
            $table->string('cta_label', 80)->nullable();
            $table->string('cta_url')->nullable();
            $table->longText('body_html')->nullable();
            $table->text('footer_note')->nullable();
            $table->timestamps();
        });

        Schema::create('email_campaigns', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 150);
            $table->foreignId('template_id')->nullable()->constrained('email_templates')->nullOnDelete();
            $table->string('subject', 255)->nullable(); // overrides the template subject when set
            $table->string('audience', 40);
            $table->json('audience_filter')->nullable();
            $table->text('custom_emails')->nullable();
            $table->string('status', 20)->default('draft'); // draft | sending | sent
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('sent')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->unsignedInteger('opened')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('email_campaign_recipients', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('campaign_id')->constrained('email_campaigns')->cascadeOnDelete();
            $table->string('email', 190);
            $table->string('name', 150)->nullable();
            $table->json('vars')->nullable();
            $table->string('status', 20)->default('pending'); // pending | sent | failed | skipped
            $table->string('error', 500)->nullable();
            $table->string('token', 64)->unique();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->unsignedInteger('open_count')->default(0);
            $table->timestamps();
            $table->unique(['campaign_id', 'email']);
            $table->index(['campaign_id', 'status']);
        });

        Schema::create('email_suppressions', function (Blueprint $table): void {
            $table->id();
            $table->string('email', 190)->unique();
            $table->string('reason', 40)->default('unsubscribed');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_suppressions');
        Schema::dropIfExists('email_campaign_recipients');
        Schema::dropIfExists('email_campaigns');
        Schema::dropIfExists('email_templates');
    }
};
