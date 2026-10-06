<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'category_id', 'nominee_name', 'handle', 'platform', 'reason',
    'submitter_name', 'submitter_email', 'status',
])]
class Nomination extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CHANGES_REQUESTED = 'changes_requested';

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
