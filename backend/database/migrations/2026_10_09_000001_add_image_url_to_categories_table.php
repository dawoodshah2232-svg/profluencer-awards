<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Admin-managed category artwork (falls back to the bundled image when null). */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->string('image_url')->nullable()->after('description');
            $table->string('tagline', 255)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->dropColumn(['image_url', 'tagline']);
        });
    }
};
