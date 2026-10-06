<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Versioned, published result sets. Mirrors `result_snapshots`. */
    public function up(): void
    {
        Schema::create('result_snapshots', function (Blueprint $table): void {
            $table->id();
            $table->integer('version')->unique();
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->json('payload');
            $table->dateTime('published_at');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('result_snapshots');
    }
};
