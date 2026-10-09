<?php

namespace App\Services;

use App\Mail\TemplateMail;
use App\Models\EmailCampaign;
use App\Models\EmailCampaignRecipient;
use App\Models\EmailSuppression;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Sends a campaign in small batches. The admin page calls process()
 * repeatedly until nothing is pending, so sending works on shared hosting
 * without a queue worker and survives a closed browser (the next "Resume"
 * picks up where it stopped).
 */
class CampaignSender
{
    /** Freezes the audience into recipient rows and marks the campaign as sending. */
    public static function start(EmailCampaign $campaign): void
    {
        DB::transaction(function () use ($campaign): void {
            $rows = CampaignAudience::resolve($campaign->audience, $campaign->audience_filter ?? [], $campaign->custom_emails);
            $now = now();
            foreach (array_chunk(array_values($rows), 200) as $chunk) {
                EmailCampaignRecipient::query()->insertOrIgnore(array_map(fn (array $r): array => [
                    'campaign_id' => $campaign->id,
                    'email' => $r['email'],
                    'name' => $r['name'] ?: null,
                    'vars' => json_encode($r['vars']),
                    'status' => 'pending',
                    'token' => Str::random(40),
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $chunk));
            }

            $campaign->forceFill([
                'status' => 'sending',
                'total' => $campaign->recipients()->count(),
                'started_at' => $campaign->started_at ?? $now,
            ])->save();
        });
    }

    /**
     * Sends up to $limit pending recipients.
     *
     * @return array{processed: int, pending: int}
     */
    public static function process(EmailCampaign $campaign, int $limit = 25): array
    {
        $template = $campaign->template;
        $batch = $campaign->recipients()->where('status', 'pending')->orderBy('id')->limit($limit)->get();

        foreach ($batch as $r) {
            if ($template === null) {
                $r->forceFill(['status' => 'failed', 'error' => 'Template was deleted'])->save();

                continue;
            }
            if (EmailSuppression::isSuppressed($r->email)) {
                $r->forceFill(['status' => 'skipped', 'error' => 'Unsubscribed'])->save();

                continue;
            }
            try {
                $out = EmailRenderer::render($template, ['name' => (string) $r->name, 'email' => $r->email] + ($r->vars ?? []), $campaign->subject, $r->token);
                Mail::to($r->email, $r->name)->send(new TemplateMail($out['subject'], $out['html'], $out['text']));
                $r->forceFill(['status' => 'sent', 'sent_at' => now(), 'error' => null])->save();
            } catch (\Throwable $e) {
                $r->forceFill(['status' => 'failed', 'error' => mb_substr($e->getMessage(), 0, 480)])->save();
            }
        }

        self::refreshCounts($campaign);
        $pending = $campaign->recipients()->where('status', 'pending')->count();
        if ($pending === 0 && $campaign->status === 'sending') {
            $campaign->forceFill(['status' => 'sent', 'finished_at' => now()])->save();
        }

        return ['processed' => $batch->count(), 'pending' => $pending];
    }

    public static function refreshCounts(EmailCampaign $campaign): void
    {
        $counts = $campaign->recipients()->selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');
        $campaign->forceFill([
            'total' => (int) $counts->sum(),
            'sent' => (int) ($counts['sent'] ?? 0),
            'failed' => (int) ($counts['failed'] ?? 0),
            'opened' => $campaign->recipients()->whereNotNull('opened_at')->count(),
        ])->save();
    }
}
