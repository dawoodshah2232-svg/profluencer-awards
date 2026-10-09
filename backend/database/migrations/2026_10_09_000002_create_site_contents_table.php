<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Admin-managed website content: news articles, sponsor tiers, FAQs.
     * One table keyed by `type`; type-specific fields live in `meta`.
     */
    public function up(): void
    {
        Schema::create('site_contents', function (Blueprint $table): void {
            $table->id();
            $table->string('type', 30);
            $table->string('slug', 160)->nullable();
            $table->string('title', 255);
            $table->text('subtitle')->nullable();
            $table->longText('body')->nullable();
            $table->string('image_url')->nullable();
            $table->json('meta')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->index(['type', 'is_published', 'sort_order']);
            $table->unique(['type', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_contents');
    }
};
