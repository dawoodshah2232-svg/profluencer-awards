<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;

/**
 * Email delivery settings managed from Admin → Settings → Email delivery.
 *
 * driver: "env"   — keep the server's .env MAIL_* configuration (default)
 *         "smtp"  — any SMTP server (cPanel mail, Brevo SMTP relay, Gmail…)
 *         "brevo" — Brevo transactional API with an API key
 * Secrets (SMTP password, Brevo API key) are stored encrypted with APP_KEY
 * and never returned to the browser.
 */
class MailSettings
{
    public const DRIVERS = ['env', 'smtp', 'brevo'];

    private const SECRETS = ['mail_smtp_password', 'mail_brevo_api_key'];

    /** Applies the stored settings to the mail config. Safe before migrations exist. */
    public static function apply(): void
    {
        try {
            $driver = Setting::get('mail_driver', 'env');
        } catch (\Throwable) {
            return;
        }

        $fromAddress = Setting::get('mail_from_address');
        $fromName = Setting::get('mail_from_name');
        if ($fromAddress) {
            config(['mail.from.address' => $fromAddress]);
        }
        if ($fromName) {
            config(['mail.from.name' => $fromName]);
        }

        if ($driver === 'smtp' && Setting::get('mail_smtp_host')) {
            $encryption = Setting::get('mail_smtp_encryption', 'tls');
            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.host' => Setting::get('mail_smtp_host'),
                'mail.mailers.smtp.port' => (int) Setting::get('mail_smtp_port', '587'),
                'mail.mailers.smtp.username' => Setting::get('mail_smtp_username'),
                'mail.mailers.smtp.password' => self::secret('mail_smtp_password'),
                'mail.mailers.smtp.encryption' => $encryption === 'none' ? null : $encryption,
            ]);
        } elseif ($driver === 'brevo' && ($key = self::secret('mail_brevo_api_key'))) {
            config([
                'mail.default' => 'brevo',
                'mail.mailers.brevo' => ['transport' => 'brevo', 'key' => $key],
            ]);
        }

        Mail::purge();
    }

    /** Settings for the admin form: secrets reduced to "is set" flags. */
    public static function forAdmin(): array
    {
        return [
            'driver' => Setting::get('mail_driver', 'env'),
            'from_address' => Setting::get('mail_from_address') ?: config('mail.from.address'),
            'from_name' => Setting::get('mail_from_name') ?: config('mail.from.name'),
            'smtp_host' => Setting::get('mail_smtp_host'),
            'smtp_port' => Setting::get('mail_smtp_port', '587'),
            'smtp_username' => Setting::get('mail_smtp_username'),
            'smtp_encryption' => Setting::get('mail_smtp_encryption', 'tls'),
            'smtp_password_set' => self::secret('mail_smtp_password') !== null,
            'brevo_api_key_set' => self::secret('mail_brevo_api_key') !== null,
            'brevo_api_key_hint' => ($k = self::secret('mail_brevo_api_key')) ? '…'.substr($k, -4) : null,
            'active_mailer' => config('mail.default'),
        ];
    }

    /** @param  array<string, mixed>  $data  validated form data; empty secrets keep the stored value */
    public static function save(array $data): void
    {
        $plain = [
            'driver' => 'mail_driver', 'from_address' => 'mail_from_address', 'from_name' => 'mail_from_name',
            'smtp_host' => 'mail_smtp_host', 'smtp_port' => 'mail_smtp_port',
            'smtp_username' => 'mail_smtp_username', 'smtp_encryption' => 'mail_smtp_encryption',
        ];
        foreach ($plain as $field => $key) {
            if (array_key_exists($field, $data)) {
                Setting::put($key, $data[$field] === null ? null : (string) $data[$field]);
            }
        }

        foreach (['smtp_password' => 'mail_smtp_password', 'brevo_api_key' => 'mail_brevo_api_key'] as $field => $key) {
            if (! empty($data[$field])) {
                Setting::put($key, Crypt::encryptString(trim((string) $data[$field])));
            }
        }
    }

    private static function secret(string $key): ?string
    {
        $stored = Setting::get($key);
        if (! $stored) {
            return null;
        }
        try {
            return Crypt::decryptString($stored);
        } catch (\Throwable) {
            return null; // APP_KEY changed — the admin must re-enter the secret
        }
    }

    /** Keys that must never be exposed through generic settings endpoints. */
    public static function secretKeys(): array
    {
        return self::SECRETS;
    }
}
