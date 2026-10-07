# BACKEND_NOTES.md — ProFluencer Awards API

Implementation notes for the Laravel backend (`backend/`). Status: built and
verified 2026-10-06 (see Verification at the bottom).

## Stack

- **Laravel 10.x** (10.50.x, final 10.x line) on **PHP 8.1+**, API-only, MySQL/MariaDB.
  Composer is pinned to `config.platform.php = 8.1.0`, so `composer update`
  only ever resolves packages that run on PHP 8.1 hosting.
- Auth: **Laravel Sanctum 3** personal access tokens (Bearer).
- Queue: **database** driver (cPanel-compatible; cron runs
  `queue:work --stop-when-empty`). No Octane / Horizon.
- Timezone: `Asia/Dubai` (`APP_TIMEZONE`).

> **Version note (2026-10-07):** downgraded from Laravel 13 / PHP 8.3 to
> Laravel 10 / PHP 8.1 on request, to match the target hosting. Laravel 10 is
> **end-of-life** (security fixes ended Feb 2025). Three published advisories
> have no 10.x fix and are explicitly ignored in `composer.json`
> (`config.policy.advisories.ignore-id`), each with a mitigation:
>
> | Advisory | Severity | Why it is acceptable here |
> |---|---|---|
> | GHSA-5vg9-5847-vvmq — CRLF injection in `email` rule | high | Every email field also runs `App\Rules\NoLineBreaks`, which rejects CR/LF and control characters before the `email` rule. **Any new email field must add it.** |
> | GHSA-crmm-hgp2-wgrp — temporary signed URL path confusion | medium | The app uses no signed URLs. Do not add any without upgrading. |
> | GHSA-jh5r-qr3c-85q8 — XSS on debug error page | low | Only reachable with `APP_DEBUG=true`; production must keep `APP_DEBUG=false`. |
>
> Upgrade to a supported Laravel release (12/13, PHP 8.2+/8.3+) as soon as
> the hosting allows.
>
> Laravel 10 structure: middleware aliases live in `app/Http/Kernel.php`
> (`role` → `RoleMiddleware`), JSON error rendering for `/api/*` in
> `app/Exceptions/Handler.php`, rate limiters in `AppServiceProvider`.
> `Sanctum::ignoreMigrations()` is set because `personal_access_tokens` is
> created by our own migration. The default 60/min `throttle:api` group limit
> was removed from the `api` middleware group; the per-route limiters
> (`votes`, `otp`, `nominations`, `login`) apply as before.

## Endpoint table (`/api/v1`)

### Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness probe |
| GET | `/settings` | public settings: voting window, ceremony, `results_published` |
| GET | `/categories` | 10 categories with approved-nominee counts |
| GET | `/categories/{slug}/nominees` | approved nominees; vote counts only while voting live or results published |
| GET | `/categories/{slug}/leaderboard` | top 5; snapshot when published, live while voting, 403 otherwise |
| POST | `/votes` | cast vote → `held` + OTP email. Throttle `votes`. `Idempotency-Key` header supported |
| POST | `/votes/verify` | `{vote_id, code}` → `counted`. Throttle `otp` |
| POST | `/votes/resend-otp` | `{vote_id}`; 60s cooldown. Throttle `otp` |
| POST | `/nominations` | public nomination submission (throttled) |
| POST | `/rsvps` | public ceremony RSVP (throttled) |
| POST | `/enquiries` | contact form (throttled) |
| POST | `/auth/login` | `{email, password}` → Bearer token (throttled) |
| POST | `/auth/register` | influencer self-nomination: `{name, display_name, email, password≥8, mobile?, country?, city?, category_id, platform?, handle?, profile_url?, bio?}` → user (role `influencer`) + nominee (`pending`) + token (throttled) |
| GET | `/voting/state` | `{state: upcoming\|live\|ended, voting_open, voting_start, voting_end}` |
| GET | `/nominees` | approved nominees; `?category=` id, `?status=` accepted (approved only) |
| GET | `/nominees/{id}` | approved nominee profile (404 otherwise) |
| GET | `/nominees/{id}/votes` | recent counted votes, timestamps only (no voter PII) |
| GET | `/nominees/{id}/analytics` | `?window_ms=` → `{count}` counted votes in window |
| GET | `/categories/{id\|slug}/stats` | `{approved_count, total}` |
| GET | `/categories/{id\|slug}/top5` | top 5: snapshot when published, live while voting, 403 otherwise |
| GET | `/analytics/votes-per-day` | `?days=&nominee_id=` → `[{date, count}]` |
| GET | `/analytics/votes-by-category` | `{category_id: count}` |
| GET | `/results` | published snapshot payload, or 404 |
| GET | `/votes/my-choice` | `?category=&email=&phone=` → `{nominee_id}` of voter's existing held/counted vote (throttled) |
| POST | `/admin/login` | staff login `{username (email or name), password}` → Bearer token (throttled) |

### Authenticated (`auth:sanctum`)

| Method | Path | Notes |
|---|---|---|
| GET | `/auth/me` | current user + linked nominee |
| POST | `/auth/logout` | revoke current token |
| GET | `/influencer/me` | own nominee profile (`role:influencer`) |
| GET | `/influencer/stats` | votes, rank, momentum (today/7d/best day), milestones 10→1000 |
| GET | `/influencer/leaderboard` | own category top 5 with `is_me` flags |

### Admin (`role: super_admin,admin,editor`)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | KPIs, per-category breakdown, integrity counters |
| CRUD | `/admin/nominees` | delete blocked when votes exist (409) |
| GET/POST | `/admin/nominations`, `…/{id}/review` | review `{decision: approved\|rejected\|changes_requested}`; approving creates the nominee |
| GET | `/admin/voters`, `/admin/voters/{id}` | read-only voter directory |
| GET | `/admin/voters/stats` | `{voters, votes_counted, avg_votes_per_voter, multi_category_voters, new_voters_today}` |
| GET/POST | `/admin/votes`, `…/{vote}/invalidate` | invalidate needs `{reason}`; decrements cached count if it was counted; row retained |
| GET/PUT/PATCH | `/admin/settings` | bulk key/value update; allow-listed keys only; audit-logged |
| POST/DELETE | `/admin/results/publish`, `/admin/results/unpublish`, `DELETE /admin/results` | publish freezes counted totals into a versioned snapshot; unpublish hides results; snapshots retained |
| GET | `/admin/results/snapshots[/{id}]` | snapshot list / detail (`?with_payload=1` for the frozen payload) |
| GET | `/admin/audit-logs`, `/admin/audit` | read-only (no update/delete routes exist) |
| GET/POST | `/admin/rsvps`, `…/{rsvp}/check-in` (+ `/checkin` alias) | door check-in |
| GET/POST/PATCH | `/admin/enquiries`, `…/{enquiry}/read` | inbox; PATCH `{read:true}` |
| GET | `/admin/analytics/votes-per-hour` | `?hours=` → `[{hour, count}]` counted votes per hour |
| GET | `/admin/analytics/new-voters-per-day` | `?days=` → `[{date, count}]` |
| GET | `/admin/analytics/blocked-attempts` | `{count}` of `vote.duplicate_blocked` audit events |
| GET | `/admin/export/{kind}` | CSV download: `votes|voters|nominees|rsvps|enquiries|nominations` |
| PATCH/DELETE | `/admin/nominations/{id}` | PATCH `{status, review_notes?}` compat; DELETE rejects (audit-kept) |
| POST | `/admin/logout` | revoke current staff token |

Rate limiters (`AppServiceProvider`): `votes` 12/min/IP, `otp` 10/min/IP,
`nominations` 5/min/IP, `login` 10/min/IP.

## OTP flow (production)

1. `POST /votes` validates name/email/phone + nominee, checks the voting
   window (`settings.voting_start` → `voting_end`, whole days, Asia/Dubai).
2. Phone is normalized (`PhoneNormalizer`: strip non-digits; `+971`/`00971`/
   leading `0` → `971…`; other numbers keep their country code).
3. Voter lookup by **email OR normalized phone** (both unique). Existing
   counted vote in the category → `409 ALREADY_VOTED`; invalidated → `409`;
   existing held vote → OTP refreshed on the same row (no duplicate rows).
4. Vote created as `held` with `otp_hash` (bcrypt), `otp_expires_at`
   (+`OTP_TTL_MINUTES`, default 10), `ip_hash` (sha256), user agent,
   optional `idempotency_key` (unique). Race-safe via the
   `UNIQUE(voter_id, category_id)` index (duplicate → 409).
5. `SendVoteOtp` job queued (database driver) → `VoteOtpMail` (text email).
6. `POST /votes/verify`: wrong code → 422 + `otp_attempts`++ (max
   `OTP_MAX_ATTEMPTS`=5, then resend required); expired → 422; correct →
   transaction: status=`counted`, `nominees.votes_count`++, `voters.verified_at`
   set, `otp_hash` cleared, audit entry `vote.counted`.
7. Unverified votes never count. Fraud → admin `invalidate` with reason;
   rows are never deleted (model-level `deleting` guard throws).

## Reconciliation with `database/schema.sql`

The Laravel migrations describe the **same 12 tables**. Two deliberate
differences to reconcile before going live if both packages are used:

1. **`users.role` enum**: migrations add a 4th value, `'influencer'`, because
   the influencer portal authenticates through the `users` table
   (`influencer_accounts.user_id → users.id`) and the role middleware needs a
   distinct role. `database/schema.sql` has only
   `super_admin,admin,editor`. Pick one list — if the SQL package is the
   source of truth, add `'influencer'` to its enum.
2. **`audit_logs` / `result_snapshots` `created_at`**: migrations use
   `$table->timestamp('created_at')->useCurrent()` — identical semantics to
   the SQL package's `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.

Everything else (column names/types, native ENUMs, unique keys, FK actions —
RESTRICT on votes/nominees, SET NULL on nominations.category_id, CASCADE on
influencer_accounts.nominee_id) matches `schema.sql` 1:1. Seeds are also
aligned: same 10 category names/slugs and the same 7 settings keys/values as
`database/seeds.sql`.

## Stubbed / env-dependent items (not code-complete without real config)

- **Mail driver**: `.env.example` documents SMTP via the cPanel email
  account; local dev uses `MAIL_MAILER=log`. Real OTP delivery needs the
  production `MAIL_*` values and the queue cron (see README).
- **SMS OTP**: intentionally not built — the agreed direction is email OTP
  only (phone stays a uniqueness identifier).
- **Dual approval for publishing**: `results/publish` currently needs one
  admin token; the "dual approval" step is a process rule, not yet a
  two-signature flow.
- **CAPTCHA / device fingerprinting / spike auto-blocking**: rate limiters,
  idempotency, IP hashing and the duplicate-attempt audit trail are in;
  a CAPTCHA widget and automated spike response are frontend + future work.
- **Password reset**: `password_reset_tokens` table exists; the reset-mail
  flow is not yet exposed as an endpoint.

## Verification (2026-10-06, local)

- `php artisan migrate` — all 16 migrations clean on MariaDB 10.11.
- `php artisan db:seed` — 10 categories, 7 settings, 1 admin user.
- `php artisan config:clear && php artisan route:list --path=api` — 42
  routes under `/api/v1`, all present.
- `php artisan test` — **11 passed** (voting flow: held→OTP→counted,
  wrong/expired codes, duplicate email/phone blocked, cross-category
  allowed, idempotency replay, closed-window 403).
- `php -l` on every new PHP file — no syntax errors; `vendor/bin/pint`
  applied.
- End-to-end against MySQL via `artisan serve`: admin login → settings →
  nominee create → vote (`held`) → queue worker delivered OTP email →
  verify (`counted`, `votes_count`=1) → duplicate email **and** duplicate
  phone-variant (`0501234567` vs `+971501234567`) both `409 ALREADY_VOTED` →
  results publish → public snapshot leaderboard → unpublish. Smoke data
  removed afterwards; DB left with categories/settings/admin only.
