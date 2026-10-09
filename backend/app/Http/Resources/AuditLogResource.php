<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AuditLog */
class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'actor_type' => $this->actor_type,
            'actor_id' => $this->actor_id,
            'actor_name' => $this->actorName(),
            'action' => $this->action,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id,
            'meta' => $this->meta,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /** @var array<int, string|null> per-request cache of user names */
    private static array $names = [];

    /** Staff and influencer actors are users; voter/system actors have no name. */
    private function actorName(): ?string
    {
        if ($this->actor_id === null || ! in_array($this->actor_type, ['admin', 'influencer'], true)) {
            return null;
        }

        return self::$names[$this->actor_id] ??= User::query()->whereKey($this->actor_id)->value('name');
    }
}
