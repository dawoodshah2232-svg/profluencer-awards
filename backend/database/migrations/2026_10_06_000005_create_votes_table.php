<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Immutable vote ledger. Rows are NEVER deleted; fraud is handled by
     * flipping status to 'invalidated' with a reason.
     * Flow: held (OTP pending) -> counted (OTP verified) | invalidated.
     * Mirrors database/schema.sql `votes`.
     */
    public function up(): void
    {
        Schema::create('votes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('voter_id')->constrained()->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('nominee_id')->constrained()->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('category_id')->constrained()->restrictOnDelete()->cascadeOnUpdate();
            $table->enum('status', ['held', 'counted', 'invalidated'])->default('held');
            $table->string('otp_hash')->nullable();
            $table->dateTime('otp_expires_at')->nullable();
            $table->tinyInteger('otp_attempts')->default(0);
            $table->string('invalidated_reason')->nullable();
            $table->char('ip_hash', 64)->nullable();
            $table->string('user_agent')->nullable();
            $table->string('idempotency_key', 64)->nullable()->unique();
            $table->timestamps();
            // One vote per voter per category (held + counted both count).
            $table->unique(['voter_id', 'category_id']);
            $table->index(['nominee_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votes');
    }
};
