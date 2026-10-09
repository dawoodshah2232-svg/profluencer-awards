<?php

namespace App\Http\Resources;

use App\Models\SiteContent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SiteContent */
class SiteContentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'slug' => $this->slug,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'body' => $this->body,
            'image_url' => $this->image_url,
            'meta' => $this->meta ?? (object) [],
            'sort_order' => $this->sort_order,
            'is_published' => $this->is_published,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
