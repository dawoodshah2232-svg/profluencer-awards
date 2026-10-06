<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'email', 'mobile', 'guest_type', 'guests_count', 'checked_in_at'])]
class Rsvp extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
        ];
    }

    public function isCheckedIn(): bool
    {
        return $this->checked_in_at !== null;
    }
}
