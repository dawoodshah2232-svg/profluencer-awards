<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Nominee extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CHANGES_REQUESTED = 'changes_requested';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = ['category_id', 'name', 'handle', 'platform', 'bio', 'photo_url', 'mobile', 'country', 'city', 'profile_url', 'followers', 'status', 'votes_count', 'review_notes', 'verification', 'reviewed_by', 'reviewed_at'];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'verification' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    public function countedVotes(): HasMany
    {
        return $this->hasMany(Vote::class)->where('status', Vote::STATUS_COUNTED);
    }

    public function influencerAccount(): HasOne
    {
        return $this->hasOne(InfluencerAccount::class);
    }
}
