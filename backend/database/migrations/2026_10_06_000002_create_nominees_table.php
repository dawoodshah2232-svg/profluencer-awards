<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Shortlisted influencers per category. Mirrors database/schema.sql `nominees`. */
    public function up(): void
    {
        Schema::create('nominees', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete()->cascadeOnUpdate();
            $table->string('name', 150);
            $table->string('handle', 120)->nullable();
            $table->string('platform', 50)->nullable();
            $table->text('bio')->nullable();
            $table->string('photo_url')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'changes_requested'])->default('pending');
            $table->integer('votes_count')->default(0);
            $table->timestamps();
            $table->index(['category_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nominees');
    }
};
