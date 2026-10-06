<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use LogicException;

#[Fillable(['actor_type', 'actor_id', 'action', 'subject_type', 'subject_id', 'meta'])]
class AuditLog extends Model
{
    /** Append-only: no updated_at column exists. */
    public const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    protected static function booted(): void
    {
        // The audit log is immutable: rows can be inserted and read, never
        // changed or removed. (Also enforceable via DB GRANTs — see README.)
        static::updating(function (AuditLog $log): void {
            throw new LogicException('Audit log entries are immutable and cannot be updated.');
        });

        static::deleting(function (AuditLog $log): void {
            throw new LogicException('Audit log entries are immutable and cannot be deleted.');
        });
    }
}
