<?php

namespace App\Services;

use App\Models\EmailTemplate;
use App\Models\Setting;
use Carbon\Carbon;

/**
 * Renders an email template into the branded layout:
 *   header  — project logo, centred
 *   hero    — eyebrow, title, subtitle, optional image, call-to-action
 *   content — the template's HTML body
 *   footer  — links, footer note, unsubscribe (campaigns only)
 *
 * Table-based markup with inline styles so it survives Gmail, Outlook and
 * Apple Mail. {{placeholders}} are replaced everywhere; values are
 * HTML-escaped. Unknown placeholders are left empty.
 */
class EmailRenderer
{
    /** Placeholders available in every email, with a description for the editor. */
    public const VARIABLES = [
        'name' => 'Recipient full name',
        'first_name' => 'Recipient first name',
        'email' => 'Recipient email',
        'category' => 'Nominee category (nominee audiences)',
        'voting_link' => 'Nominee public voting page (nominee audiences)',
        'dashboard_url' => 'Creator dashboard',
        'site_url' => 'Website home',
        'login_url' => 'Creator sign-in page',
        'register_url' => 'Registration page',
        'leaderboard_url' => 'Live leaderboard',
        'winners_url' => 'Winners page',
        'event_url' => 'Ceremony & RSVP page',
        'voting_start' => 'Voting opens (e.g. October 20, 2026)',
        'voting_end' => 'Voting closes (e.g. November 30, 2026)',
        'ceremony_date' => 'Ceremony date (e.g. Friday, December 11, 2026)',
        'ceremony_city' => 'Ceremony city',
        'code' => 'Vote verification code (vote code email)',
        'reset_url' => 'Password reset link (password email)',
        'notes' => 'Reviewer note (nomination emails)',
        'nominee_name' => 'Nominee voted for (vote code email)',
    ];

    /**
     * @param  array<string, mixed>  $vars
     * @return array{subject: string, html: string, text: string}
     */
    public static function render(EmailTemplate $t, array $vars = [], ?string $subjectOverride = null, ?string $trackingToken = null): array
    {
        $vars = self::globals() + $vars;
        if (empty($vars['first_name']) && ! empty($vars['name'])) {
            $vars['first_name'] = strtok((string) $vars['name'], ' ');
        }

        // Plain fields are filled raw and escaped once at output; the HTML body gets escaped values.
        $fill = fn (?string $s): string => self::fill((string) $s, $vars, false);
        $esc = fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

        $site = $vars['site_url'];
        $logo = $site.'/img/logo-clean.png';
        $subject = $fill($subjectOverride ?: $t->subject);
        $preheader = $fill($t->preheader);
        $eyebrow = $fill($t->hero_eyebrow);
        $title = $fill($t->hero_title);
        $subtitle = $fill($t->hero_subtitle);
        $image = $fill($t->hero_image_url);
        if ($image !== '' && ! preg_match('#^https?://#i', $image)) {
            $image = $site.'/'.ltrim($image, '/');
        }
        $ctaLabel = $fill($t->cta_label);
        $ctaUrl = $fill($t->cta_url);
        $body = self::fill((string) $t->body_html, $vars, true);
        $footerNote = $fill($t->footer_note);

        $apiBase = rtrim((string) config('app.url'), '/').'/api/v1';
        $unsubscribe = $trackingToken ? $apiBase.'/e/u/'.$trackingToken : null;
        $pixel = $trackingToken ? '<img src="'.$esc($apiBase.'/e/o/'.$trackingToken.'.gif').'" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px">' : '';

        $gold = '#d4af37';
        $font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

        $hero = '';
        if ($title !== '' || $eyebrow !== '' || $subtitle !== '' || $image !== '') {
            $hero = '<tr><td style="background:#0f1626;background-image:linear-gradient(160deg,#141d31 0%,#0b1120 100%);padding:40px 40px 44px;text-align:center">'
                .($eyebrow !== '' ? '<div style="font:700 11px/1 '.$font.';letter-spacing:3px;text-transform:uppercase;color:#f3d27a;margin:0 0 14px">'.$esc($eyebrow).'</div>' : '')
                .($title !== '' ? '<h1 style="margin:0;font:800 28px/1.25 '.$font.';color:#ffffff">'.$esc($title).'</h1>' : '')
                .($subtitle !== '' ? '<p style="margin:14px auto 0;max-width:460px;font:400 16px/1.6 '.$font.';color:#c9cfdb">'.nl2br($esc($subtitle)).'</p>' : '')
                .($image !== '' ? '<img src="'.$esc($image).'" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:12px;margin:26px auto 0">' : '')
                .($ctaLabel !== '' && $ctaUrl !== '' ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto 0"><tr><td style="border-radius:999px;background:'.$gold.'"><a href="'.$esc($ctaUrl).'" style="display:inline-block;padding:14px 32px;font:700 15px/1 '.$font.';color:#1a1405;text-decoration:none;border-radius:999px">'.$esc($ctaLabel).'</a></td></tr></table>' : '')
                .'</td></tr>';
        }

        $content = trim(strip_tags($body)) !== ''
            ? '<tr><td style="background:#ffffff;padding:36px 40px;font:400 15px/1.7 '.$font.';color:#2b2f38">'.self::styleBody($body, $font).'</td></tr>'
            : '';

        $links = [['Website', $site], ['Leaderboard', $vars['leaderboard_url']], ['Event', $vars['event_url']]];
        $linkHtml = implode('<span style="color:#4b5468">&nbsp;&nbsp;·&nbsp;&nbsp;</span>', array_map(
            fn ($l) => '<a href="'.$esc($l[1]).'" style="color:#f3d27a;text-decoration:none">'.$l[0].'</a>', $links));

        $footer = '<tr><td style="background:#070b14;padding:30px 40px;text-align:center;font:400 12px/1.7 '.$font.';color:#8a93a6">'
            .'<div style="margin-bottom:12px;font-size:13px">'.$linkHtml.'</div>'
            .($footerNote !== '' ? '<div style="margin-bottom:10px">'.nl2br($esc($footerNote)).'</div>' : '')
            .'<div>ProFluencer Awards '.$esc((string) Setting::get('edition', '2026')).' · '.$esc((string) $vars['ceremony_city']).', UAE</div>'
            .($unsubscribe ? '<div style="margin-top:10px">You received this because you are part of the ProFluencer Awards community. <a href="'.$esc($unsubscribe).'" style="color:#8a93a6;text-decoration:underline">Unsubscribe</a></div>' : '')
            .'</td></tr>';

        $html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>'.$esc($subject).'</title></head>'
            .'<body style="margin:0;padding:0;background:#ece8df">'
            .($preheader !== '' ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0">'.$esc($preheader).'</div>' : '')
            .'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ece8df"><tr><td align="center" style="padding:28px 12px">'
            .'<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;border-radius:16px;overflow:hidden">'
            .'<tr><td style="background:#070b14;padding:26px 24px;text-align:center;border-bottom:2px solid '.$gold.'"><a href="'.$esc($site).'"><img src="'.$esc($logo).'" alt="ProFluencer Awards Dubai 2026" height="64" style="display:block;margin:0 auto;height:64px;width:auto;border:0"></a></td></tr>'
            .$hero.$content.$footer
            .'</table>'.$pixel.'</td></tr></table></body></html>';

        return ['subject' => $subject, 'html' => $html, 'text' => self::toText($title, $subtitle, $body, $ctaLabel, $ctaUrl, $unsubscribe)];
    }

    /** @return array<string, string> */
    public static function globals(): array
    {
        $site = rtrim(trim(explode(',', (string) config('pfa.frontend_url'))[0]), '/');
        $fmt = function (?string $d, string $format): string {
            try {
                return $d ? Carbon::parse($d)->format($format) : '';
            } catch (\Throwable) {
                return (string) $d;
            }
        };

        return [
            'site_url' => $site,
            'login_url' => $site.'/#/login',
            'register_url' => $site.'/#/register',
            'dashboard_url' => $site.'/#/dashboard',
            'leaderboard_url' => $site.'/#/leaderboard',
            'winners_url' => $site.'/#/winners',
            'event_url' => $site.'/#/event',
            'voting_start' => $fmt(Setting::get('voting_start'), 'F j, Y'),
            'voting_end' => $fmt(Setting::get('voting_end'), 'F j, Y'),
            'ceremony_date' => $fmt(Setting::get('ceremony_date'), 'l, F j, Y'),
            'ceremony_city' => (string) Setting::get('ceremony_city', 'Dubai'),
        ];
    }

    /** @param  array<string, mixed>  $vars */
    private static function fill(string $s, array $vars, bool $html): string
    {
        return preg_replace_callback('/\{\{\s*([a-z_]+)\s*\}\}/i', function (array $m) use ($vars, $html): string {
            $value = (string) ($vars[strtolower($m[1])] ?? '');

            return $html ? htmlspecialchars($value, ENT_QUOTES, 'UTF-8') : $value;
        }, $s) ?? $s;
    }

    /** Gives bare tags in the body sensible inline email styles. */
    private static function styleBody(string $body, string $font): string
    {
        $styles = [
            'h2' => 'margin:0 0 12px;font:800 20px/1.3 '.$font.';color:#111827',
            'h3' => 'margin:22px 0 8px;font:700 17px/1.35 '.$font.';color:#111827',
            'p' => 'margin:0 0 14px',
            'ul' => 'margin:0 0 16px;padding-left:20px',
            'li' => 'margin:0 0 6px',
            'a' => 'color:#9c7a1e;font-weight:700',
            'blockquote' => 'margin:18px 0;padding:12px 18px;border-left:3px solid #d4af37;background:#faf6ee;color:#3b3f48',
        ];
        foreach ($styles as $tag => $style) {
            $body = preg_replace('/<'.$tag.'(?![^>]*\bstyle=)(\s[^>]*)?>/i', '<'.$tag.' style="'.$style.'"$1>', $body) ?? $body;
        }

        return $body;
    }

    private static function toText(string $title, string $subtitle, string $body, string $ctaLabel, string $ctaUrl, ?string $unsubscribe): string
    {
        $text = trim(html_entity_decode(strip_tags(preg_replace(['/<br\s*\/?>/i', '/<\/(p|h[1-6]|li|div)>/i'], "\n", $body) ?? $body), ENT_QUOTES, 'UTF-8'));
        $parts = array_filter([
            $title,
            $subtitle,
            $ctaLabel && $ctaUrl ? $ctaLabel.': '.$ctaUrl : '',
            preg_replace("/\n{3,}/", "\n\n", $text),
            '— ProFluencer Awards',
            $unsubscribe ? 'Unsubscribe: '.$unsubscribe : '',
        ]);

        return implode("\n\n", $parts);
    }
}
