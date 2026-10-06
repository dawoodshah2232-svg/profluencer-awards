<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Public nomination submissions awaiting review. Mirrors `nominations`. */
    public function up(): void
    {
        Schema::create('nominations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->string('nominee_name', 150);
            $table->string('handle', 120)->nullable();
            $table->string('platform', 50)->nullable();
            $table->text('reason')->nullable();
            $table->string('submitter_name', 150);
            $table->string('submitter_email', 190);
            $table->enum('status', ['pending', 'approved', 'rejected', 'changes_requested'])->default('pending');
            $table->timestamps();
            $table->index('category_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nominations');
    }
};
