<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailCampaignRecipient extends Model
{
    /**
     * @var array<int, string>
     */
    protected $fillable = ['campaign_id', 'email', 'name', 'vars', 'status', 'error', 'token', 'sent_at', 'opened_at', 'open_count'];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'vars' => 'array',
        'sent_at' => 'datetime',
        'opened_at' => 'datetime',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(EmailCampaign::class, 'campaign_id');
    }
}
