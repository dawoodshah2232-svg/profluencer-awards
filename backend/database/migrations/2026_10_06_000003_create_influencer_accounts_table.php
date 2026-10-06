<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Links a nominee to an optional portal login. Mirrors `influencer_accounts`. */
    public function up(): void
    {
        Schema::create('influencer_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('nominee_id')->unique()->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('influencer_accounts');
    }
};
