<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\TemplateMail;
use App\Models\EmailTemplate;
use App\Rules\NoLineBreaks;
use App\Services\AuditLogger;
use App\Services\EmailRenderer;
use App\Services\MailSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

/**
 * Admin → Settings → Email delivery: choose Brevo (API key) or SMTP, set
 * the sender, and send a test email.
 */
class MailSettingController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => MailSettings::forAdmin()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'driver' => ['required', Rule::in(MailSettings::DRIVERS)],
            'from_address' => ['nullable', new NoLineBreaks, 'email', 'max:190'],
            'from_name' => ['nullable', new NoLineBreaks, 'string', 'max:120'],
            'smtp_host' => ['nullable', new NoLineBreaks, 'string', 'max:190', 'required_if:driver,smtp'],
            'smtp_port' => ['nullable', 'integer', 'between:1,65535', 'required_if:driver,smtp'],
            'smtp_username' => ['nullable', new NoLineBreaks, 'string', 'max:190'],
            'smtp_password' => ['nullable', 'string', 'max:500'],
            'smtp_encryption' => ['nullable', Rule::in(['tls', 'ssl', 'none'])],
            'brevo_api_key' => ['nullable', new NoLineBreaks, 'string', 'max:500'],
        ]);

        if ($validated['driver'] === 'brevo' && empty($validated['brevo_api_key']) && ! MailSettings::forAdmin()['brevo_api_key_set']) {
            return response()->json(['message' => 'Paste your Brevo API key.', 'errors' => ['brevo_api_key' => ['Paste your Brevo API key.']]], 422);
        }

        MailSettings::save($validated);
        MailSettings::apply();

        AuditLogger::log('admin', $request->user(), 'settings.mail_updated', null, [
            'driver' => $validated['driver'],
            'secret_changed' => ! empty($validated['smtp_password']) || ! empty($validated['brevo_api_key']),
        ]);

        return response()->json(['data' => MailSettings::forAdmin(), 'message' => 'Email settings saved.']);
    }

    /** Sends a branded test email with the current settings. */
    public function test(Request $request): JsonResponse
    {
        $validated = $request->validate(['to' => ['required', new NoLineBreaks, 'email', 'max:190']]);

        MailSettings::apply();
        $template = new EmailTemplate([
            'subject' => 'ProFluencer Awards — test email',
            'hero_eyebrow' => 'Email delivery',
            'hero_title' => 'It works!',
            'hero_subtitle' => 'Your email settings are configured correctly.',
            'body_html' => '<p>This test was sent from the admin panel using <b>'.e(config('mail.default')).'</b>. Vote codes, password resets, nomination updates and campaigns will now be delivered.</p>',
        ]);

        try {
            $out = EmailRenderer::render($template, ['email' => $validated['to']]);
            Mail::to($validated['to'])->send(new TemplateMail($out['subject'], $out['html'], $out['text']));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Sending failed: '.mb_substr($e->getMessage(), 0, 300), 'code' => 'MAIL_FAILED'], 422);
        }

        return response()->json(['message' => "Test email sent to {$validated['to']} via ".config('mail.default').'.']);
    }
}
