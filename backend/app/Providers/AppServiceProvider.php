<?php

namespace App\Providers;

use App\Mail\TemplateMail;
use App\Mail\Transport\BrevoTransport;
use App\Models\EmailTemplate;
use App\Services\EmailRenderer;
use App\Services\MailSettings;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Mail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // personal_access_tokens is created by our own migration
        // (2026_10_06_181342); stop Sanctum 3 from auto-loading a duplicate.
        Sanctum::ignoreMigrations();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Public vote intake: generous enough for real voters, tight enough
        // to blunt ballot stuffing from a single IP.
        RateLimiter::for('votes', function (Request $request): Limit {
            return Limit::perMinute(12)->by($request->ip());
        });

        // OTP verify / resend: strict — brute-forcing a 6-digit code must
        // not be feasible.
        RateLimiter::for('otp', function (Request $request): Limit {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('nominations', function (Request $request): Limit {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('login', function (Request $request): Limit {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Password-reset emails link to the React app's reset page (hash routing).
        ResetPassword::createUrlUsing(function ($user, string $token): string {
            $frontend = rtrim(trim(explode(',', (string) config('pfa.frontend_url'))[0]), '/');

            return $frontend.'/#/reset-password?token='.urlencode($token).'&email='.urlencode($user->getEmailForPasswordReset());
        });
        ResetPassword::toMailUsing(function ($user, string $token): MailMessage|TemplateMail {
            $url = call_user_func(ResetPassword::$createUrlCallback, $user, $token);
            $template = EmailTemplate::query()->where('key', 'password_reset')->first();
            if ($template !== null) {
                $out = EmailRenderer::render($template, ['name' => $user->name, 'email' => $user->email, 'reset_url' => $url]);

                return (new TemplateMail($out['subject'], $out['html'], $out['text'], 'password_reset'))->to($user->email, $user->name);
            }

            return (new MailMessage)
                ->subject('Reset your ProFluencer Awards password')
                ->greeting('Hello '.$user->name.',')
                ->line('We received a request to reset the password for your ProFluencer Awards account.')
                ->action('Choose a new password', ResetPassword::$createUrlCallback
                    ? call_user_func(ResetPassword::$createUrlCallback, $user, $token)
                    : url('/'))
                ->line('This link expires in 60 minutes. If you did not ask for a reset, you can ignore this email.');
        });

        // Email delivery chosen in Admin → Settings (Brevo API or SMTP).
        Mail::extend('brevo', fn (array $config) => new BrevoTransport((string) ($config['key'] ?? '')));
        MailSettings::apply();
    }
}
