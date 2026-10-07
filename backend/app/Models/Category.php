<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = ['name', 'slug', 'description', 'sort_order'];

    public function nominees(): HasMany
    {
        return $this->hasMany(Nominee::class);
    }

    public function approvedNominees(): HasMany
    {
        return $this->hasMany(Nominee::class)->where('status', Nominee::STATUS_APPROVED);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }
}
