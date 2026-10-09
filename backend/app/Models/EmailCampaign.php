<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailCampaign extends Model
{
    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'name', 'template_id', 'subject', 'audience', 'audience_filter', 'custom_emails', 'status',
        'total', 'sent', 'failed', 'opened', 'created_by', 'started_at', 'finished_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'audience_filter' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(EmailTemplate::class, 'template_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(EmailCampaignRecipient::class, 'campaign_id');
    }
}
