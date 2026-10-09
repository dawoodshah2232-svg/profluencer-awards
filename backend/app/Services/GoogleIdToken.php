<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;

/**
 * Verifies a Google Identity Services ID token (the `credential` the
 * "Sign in with Google" button returns) with Google's tokeninfo endpoint.
 * Google checks the signature and expiry; we check audience, issuer and
 * that the email is verified.
 */
class GoogleIdToken
{
    /**
     * @return array{sub: string, email: string, name: string, picture: ?string}|null
     */
    public static function verify(string $credential): ?array
    {
        $clientId = trim((string) Setting::get('google_client_id', ''));
        if (Setting::get('google_enabled', '0') !== '1' || $clientId === '') {
            return null;
        }

        try {
            $response = Http::timeout(8)->get('https://oauth2.googleapis.com/tokeninfo', ['id_token' => $credential]);
        } catch (\Throwable) {
            return null;
        }

        if (! $response->ok()) {
            return null;
        }

        $claims = $response->json();
        $issuerOk = in_array($claims['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true);
        $verified = in_array($claims['email_verified'] ?? false, [true, 'true'], true);

        if (! $issuerOk || ($claims['aud'] ?? '') !== $clientId || ! $verified || empty($claims['sub']) || empty($claims['email'])) {
            return null;
        }

        return [
            'sub' => (string) $claims['sub'],
            'email' => mb_strtolower(trim((string) $claims['email'])),
            'name' => (string) ($claims['name'] ?? ''),
            'picture' => $claims['picture'] ?? null,
        ];
    }
}
