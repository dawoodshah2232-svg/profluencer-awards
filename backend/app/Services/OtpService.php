<?php

namespace App\Services;

use App\Models\Vote;
use Illuminate\Support\Facades\Hash;

/**
 * Email OTP lifecycle for vote verification.
 *
 * Codes are 6 digits, expire after OTP_TTL_MINUTES, and allow at most
 * OTP_MAX_ATTEMPTS verification attempts. Only a bcrypt hash of the code
 * is ever stored on the vote row.
 */
class OtpService
{
    public static function length(): int
    {
        return (int) config('voting.otp_length', 6);
    }

    public static function ttlMinutes(): int
    {
        return (int) config('voting.otp_ttl_minutes', 10);
    }

    public static function maxAttempts(): int
    {
        return (int) config('voting.otp_max_attempts', 5);
    }

    /**
     * Generate a numeric OTP of the configured length (no leading zero).
     */
    public static function generateCode(): string
    {
        $length = static::length();
        $min = (int) pow(10, $length - 1);
        $max = (int) pow(10, $length) - 1;

        return (string) random_int($min, $max);
    }

    /**
     * Issue a fresh code for a held vote: stores the hash + expiry and
     * resets the attempt counter. Returns the plain code for emailing.
     */
    public static function issueFor(Vote $vote): string
    {
        $code = static::generateCode();

        $vote->forceFill([
            'otp_hash' => Hash::make($code),
            'otp_expires_at' => now()->addMinutes(static::ttlMinutes()),
            'otp_attempts' => 0,
        ])->save();

        return $code;
    }

    public static function attemptsExhausted(Vote $vote): bool
    {
        return $vote->otp_attempts >= static::maxAttempts();
    }

    /**
     * Verify a submitted code. Increments the attempt counter on failure.
     */
    public static function verify(Vote $vote, string $code): bool
    {
        if (! $vote->isHeld() || $vote->otp_hash === null) {
            return false;
        }

        if ($vote->otpExpired() || static::attemptsExhausted($vote)) {
            return false;
        }

        if (! Hash::check(trim($code), $vote->otp_hash)) {
            $vote->increment('otp_attempts');

            return false;
        }

        return true;
    }
}
