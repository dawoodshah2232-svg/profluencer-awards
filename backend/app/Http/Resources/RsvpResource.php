<?php

namespace App\Http\Resources;

use App\Models\Rsvp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Rsvp */
class RsvpResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'mobile' => $this->mobile,
            'guest_type' => $this->guest_type,
            'guests_count' => $this->guests_count,
            'checked_in_at' => $this->checked_in_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
