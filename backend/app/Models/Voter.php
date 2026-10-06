<?php

namespace App\Models;

use App\Services\PhoneNormalizer;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'email', 'phone_normalized', 'phone_display', 'verified_at'])]
class Voter extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
        ];
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    /**
     * Find the voter identified by email OR normalized phone.
     * Either matching value identifies the same voter (duplicate-vote rule).
     */
    public static function findByIdentity(string $email, string $phone): ?self
    {
        return static::query()
            ->where('email', mb_strtolower(trim($email)))
            ->orWhere('phone_normalized', PhoneNormalizer::normalize($phone))
            ->first();
    }
}
