<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'key', 'name', 'category', 'subject', 'preheader', 'hero_eyebrow', 'hero_title', 'hero_subtitle',
        'hero_image_url', 'cta_label', 'cta_url', 'body_html', 'footer_note',
    ];

    public function isSystem(): bool
    {
        return $this->category === 'system';
    }
}
