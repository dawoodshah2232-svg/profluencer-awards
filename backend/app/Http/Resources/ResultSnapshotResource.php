<?php

namespace App\Http\Resources;

use App\Models\ResultSnapshot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ResultSnapshot */
class ResultSnapshotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'version' => $this->version,
            'published_by' => $this->published_by,
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'payload' => $this->when($request->boolean('with_payload'), $this->payload),
        ];
    }
}
