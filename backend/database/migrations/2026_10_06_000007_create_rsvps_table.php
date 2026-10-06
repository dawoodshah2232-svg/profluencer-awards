<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Ceremony attendance. Mirrors database/schema.sql `rsvps`. */
    public function up(): void
    {
        Schema::create('rsvps', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 150);
            $table->string('email', 190);
            $table->enum('guest_type', ['winner', 'honouree', 'guest', 'vip', 'media', 'team'])->default('guest');
            $table->tinyInteger('guests_count')->default(1);
            $table->dateTime('checked_in_at')->nullable();
            $table->timestamps();
            $table->index('email');
            $table->index('guest_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rsvps');
    }
};
