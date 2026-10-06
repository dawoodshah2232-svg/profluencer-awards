<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per voter identity. Email OR phone identifies the voter —
     * both are unique. Mirrors database/schema.sql `voters`.
     */
    public function up(): void
    {
        Schema::create('voters', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 150);
            $table->string('email', 190)->unique();
            $table->string('phone_normalized', 30)->unique();
            $table->string('phone_display', 40)->nullable();
            $table->dateTime('verified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voters');
    }
};
