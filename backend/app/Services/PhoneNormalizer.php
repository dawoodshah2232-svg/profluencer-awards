<?php

namespace App\Services;

/**
 * Normalizes phone numbers to a canonical digit string so that the same
 * voter is recognized across input variants (+971 50 123 4567,
 * 00971501234567, 0501234567 all become 971501234567).
 *
 * Rules:
 *  - strip every non-digit character
 *  - leading 00971 -> 971, leading 971 kept as-is (UAE country code)
 *  - a single leading 0 is a UAE trunk prefix -> replaced with 971
 *  - anything else is kept as digits (international numbers carry their
 *    own country code, e.g. 14155552671)
 */
class PhoneNormalizer
{
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone ?? '');

        if ($digits === '' || $digits === null) {
            return '';
        }

        if (str_starts_with($digits, '00971')) {
            return '971'.substr($digits, 5);
        }

        if (str_starts_with($digits, '971')) {
            return $digits;
        }

        if (str_starts_with($digits, '0')) {
            return '971'.substr($digits, 1);
        }

        return $digits;
    }

    /**
     * Keep a human-friendly display version of the number as typed.
     */
    public static function display(string $phone): string
    {
        return trim(preg_replace('/\s+/', ' ', $phone ?? ''));
    }
}
