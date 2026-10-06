<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Central helper for writing immutable audit trail entries.
 */
class AuditLogger
{
    /**
     * @param  string  $actorType  'admin' | 'influencer' | 'voter' | 'system'
     * @param  array<string, mixed>  $meta
     */
    public static function log(
        string $actorType,
        User|int|null $actor,
        string $action,
        Model|string|null $subject = null,
        array $meta = [],
    ): AuditLog {
        $actorId = $actor instanceof User ? $actor->getKey() : $actor;

        $subjectType = null;
        $subjectId = null;
        if ($subject instanceof Model) {
            $subjectType = $subject->getMorphClass();
            $subjectId = $subject->getKey();
        } elseif (is_string($subject)) {
            $subjectType = $subject;
        }

        return AuditLog::create([
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'meta' => $meta,
        ]);
    }
}
