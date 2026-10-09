<?php

namespace App\Http\Controllers;

use App\Models\EmailCampaignRecipient;
use App\Models\EmailSuppression;
use Illuminate\Http\Response;

/**
 * Public links inside campaign emails: the 1×1 open-tracking pixel and the
 * one-click unsubscribe. Both are keyed by the recipient's random token.
 */
class EmailTrackingController extends Controller
{
    public function open(string $token): Response
    {
        $r = EmailCampaignRecipient::query()->where('token', $token)->first();
        if ($r !== null) {
            $r->forceFill(['opened_at' => $r->opened_at ?? now(), 'open_count' => $r->open_count + 1])->save();
        }

        $gif = base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

        return response($gif, 200, [
            'Content-Type' => 'image/gif',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    public function unsubscribe(string $token): Response
    {
        $r = EmailCampaignRecipient::query()->where('token', $token)->first();
        if ($r !== null) {
            EmailSuppression::query()->firstOrCreate(['email' => mb_strtolower($r->email)], ['reason' => 'unsubscribed']);
        }

        $site = rtrim(trim(explode(',', (string) config('pfa.frontend_url'))[0]), '/');
        $html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head>'
            .'<body style="margin:0;background:#070b14;color:#f5f1e8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">'
            .'<div><img src="'.e($site).'/img/logo-clean.png" alt="ProFluencer Awards" style="height:80px"><h1 style="font-size:24px;margin:24px 0 8px">'.($r ? 'You are unsubscribed' : 'Link not recognised').'</h1>'
            .'<p style="color:#a9b1c2;max-width:420px;margin:0 auto 24px">'.($r ? 'You will no longer receive campaign emails from the ProFluencer Awards. Account and vote emails are still delivered.' : 'This unsubscribe link is invalid or has expired.').'</p>'
            .'<a href="'.e($site).'" style="display:inline-block;background:#d4af37;color:#1a1405;font-weight:700;padding:12px 26px;border-radius:999px;text-decoration:none">Back to the website</a></div></body></html>';

        return response($html, $r ? 200 : 404, ['Content-Type' => 'text/html; charset=utf-8']);
    }
}
