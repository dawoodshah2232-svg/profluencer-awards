<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - users.google_sub: stable Google account id for "Sign in with Google".
     * - nominees: nomination verification (genuine vs fake review) and the
     *   self-reported follower count the reviewer checks.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('google_sub', 64)->nullable()->unique()->after('email');
        });

        Schema::table('nominees', function (Blueprint $table): void {
            $table->string('followers', 40)->nullable()->after('profile_url');
            $table->text('review_notes')->nullable()->after('status');
            $table->json('verification')->nullable()->after('review_notes');
            $table->foreignId('reviewed_by')->nullable()->after('verification')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });
    }

    public function down(): void
    {
        Schema::table('nominees', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['followers', 'review_notes', 'verification', 'reviewed_at']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['google_sub']);
            $table->dropColumn('google_sub');
        });
    }
};
