<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteContent extends Model
{
    public const TYPES = ['news', 'sponsor_tier', 'faq'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = ['type', 'slug', 'title', 'subtitle', 'body', 'image_url', 'meta', 'sort_order', 'is_published'];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'meta' => 'array',
        'is_published' => 'boolean',
        'sort_order' => 'integer',
    ];
}
