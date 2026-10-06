<?php

namespace App\Http\Resources;

use App\Models\Vote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Vote */
class VoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'otp_expires_at' => $this->otp_expires_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'nominee' => new NomineeResource($this->whenLoaded('nominee')),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'voter' => new VoterResource($this->whenLoaded('voter')),
        ];
    }
}
