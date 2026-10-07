<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects CR/LF (and other control characters) in a value.
 *
 * Laravel 10 is end-of-life and its `email` rule is affected by
 * GHSA-5vg9-5847-vvmq (CRLF injection), which was only fixed in 12.x/13.x.
 * Every email field that can reach a mail header must carry this rule.
 */
class NoLineBreaks implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && preg_match('/[\x00-\x1F\x7F]/', $value) === 1) {
            $fail('The :attribute must not contain line breaks or control characters.');
        }
    }
}
