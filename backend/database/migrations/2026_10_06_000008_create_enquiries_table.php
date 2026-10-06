<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Contact-form messages. Mirrors database/schema.sql `enquiries`. */
    public function up(): void
    {
        Schema::create('enquiries', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 150);
            $table->string('email', 190);
            $table->string('subject', 190);
            $table->text('message');
            $table->dateTime('read_at')->nullable();
            $table->timestamps();
            $table->index('read_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
