<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailSuppression extends Model
{
    /**
     * @var array<int, string>
     */
    protected $fillable = ['email', 'reason'];

    public static function isSuppressed(string $email): bool
    {
        return static::query()->where('email', mb_strtolower(trim($email)))->exists();
    }
}
