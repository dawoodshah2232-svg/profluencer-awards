<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
    }
}
