<?php

namespace App\Http\Resources;

use App\Models\Nomination;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Nomination */
class NominationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nominee_name' => $this->nominee_name,
            'handle' => $this->handle,
            'platform' => $this->platform,
            'reason' => $this->reason,
            'submitter_name' => $this->submitter_name,
            'submitter_email' => $this->submitter_email,
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'category' => new CategoryResource($this->whenLoaded('category')),
        ];
    }
}
