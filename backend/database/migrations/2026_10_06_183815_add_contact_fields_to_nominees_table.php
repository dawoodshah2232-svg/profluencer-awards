<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Contact/profile fields collected at self-nomination (registration).
     * Mirrors database/schema.sql `nominees`. Additive only.
     */
    public function up(): void
    {
        Schema::table('nominees', function (Blueprint $table): void {
            $table->string('mobile', 40)->nullable()->after('photo_url');
            $table->string('country', 80)->nullable()->after('mobile');
            $table->string('city', 80)->nullable()->after('country');
            $table->string('profile_url', 255)->nullable()->after('city');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('nominees', function (Blueprint $table): void {
            $table->dropColumn(['mobile', 'country', 'city', 'profile_url']);
        });
    }
};
