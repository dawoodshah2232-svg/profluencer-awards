<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rsvp extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = ['name', 'email', 'mobile', 'guest_type', 'guests_count', 'checked_in_at'];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'checked_in_at' => 'datetime',
    ];

    public function isCheckedIn(): bool
    {
        return $this->checked_in_at !== null;
    }
}
