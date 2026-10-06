<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

#[Fillable([
    'voter_id', 'nominee_id', 'category_id', 'status',
    'otp_hash', 'otp_expires_at', 'otp_attempts',
    'invalidated_reason', 'ip_hash', 'user_agent', 'idempotency_key',
])]
class Vote extends Model
{
    public const STATUS_HELD = 'held';

    public const STATUS_COUNTED = 'counted';

    public const STATUS_INVALIDATED = 'invalidated';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'otp_expires_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // Vote rows are an immutable ledger: never delete, only invalidate.
        static::deleting(function (Vote $vote): void {
            throw new LogicException('Votes are immutable and cannot be deleted. Invalidate them instead.');
        });
    }

    public function voter(): BelongsTo
    {
        return $this->belongsTo(Voter::class);
    }

    public function nominee(): BelongsTo
    {
        return $this->belongsTo(Nominee::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function isHeld(): bool
    {
        return $this->status === self::STATUS_HELD;
    }

    public function isCounted(): bool
    {
        return $this->status === self::STATUS_COUNTED;
    }

    public function otpExpired(): bool
    {
        return $this->otp_expires_at === null || $this->otp_expires_at->isPast();
    }
}
