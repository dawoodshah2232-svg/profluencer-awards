<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Email OTP for vote verification
    |--------------------------------------------------------------------------
    | Codes are numeric, expire after `otp_ttl_minutes`, and allow at most
    | `otp_max_attempts` verification attempts before a resend is required.
    | `otp_resend_cooldown_seconds` rate-limits resend requests per vote.
    */

    'otp_length' => env('OTP_LENGTH', 6),
    'otp_ttl_minutes' => env('OTP_TTL_MINUTES', 10),
    'otp_max_attempts' => env('OTP_MAX_ATTEMPTS', 5),
    'otp_resend_cooldown_seconds' => env('OTP_RESEND_COOLDOWN_SECONDS', 60),

];
