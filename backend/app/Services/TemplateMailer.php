<?php

namespace App\Services;

use App\Mail\TemplateMail;
use App\Models\EmailTemplate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends a system email by template key (e.g. "nomination_approved").
 * Never throws: a mail failure must not break the user's action — it is
 * logged and the caller carries on. Missing templates are skipped.
 */
class TemplateMailer
{
    /** @param  array<string, mixed>  $vars */
    public static function send(string $key, string $email, ?string $name = null, array $vars = []): bool
    {
        $template = EmailTemplate::query()->where('key', $key)->first();
        if ($template === null) {
            return false;
        }

        try {
            $out = EmailRenderer::render($template, ['name' => $name ?? '', 'email' => $email] + $vars);
            Mail::to($email, $name)->send(new TemplateMail($out['subject'], $out['html'], $out['text'], $key));

            return true;
        } catch (\Throwable $e) {
            Log::warning("Email '{$key}' to {$email} failed: ".$e->getMessage());

            return false;
        }
    }

    /** Frontend link to a nominee's public voting page. */
    public static function votingLink(int $nomineeId): string
    {
        return EmailRenderer::globals()['site_url'].'/#/nominee/'.$nomineeId;
    }
}
