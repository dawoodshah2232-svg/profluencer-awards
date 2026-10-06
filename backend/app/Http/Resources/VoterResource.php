<?php

namespace App\Http\Resources;

use App\Models\Voter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Voter */
class VoterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone_display,
            'verified_at' => $this->verified_at?->toIso8601String(),
            'votes_count' => $this->whenCounted('votes'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
