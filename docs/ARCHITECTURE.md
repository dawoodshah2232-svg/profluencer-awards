# ProFluencer Awards — Architecture

## Parts

- **`frontend/`** — React 19 + Vite 8 app (package.json: `vite build`,
  `oxlint` lint). Public site, voting, influencer portal, admin CRM in one
  SPA. `HashRouter`; `vite.config.js` sets `base: './'` so it works from a
  sub-path. Build output `frontend/dist/` is plain static files.
- **`backend/`** — Laravel 13.x API (PHP 8.3), API-only. Auth: Laravel
  Sanctum personal access tokens (Bearer). Queue: `database` driver
  (cPanel-compatible; cron runs `queue:work --stop-when-empty`). No Octane /
  Horizon. Timezone `Asia/Dubai`. (Task asked for Laravel 11; Composer
  refused it due to published security advisories — see
  `backend/BACKEND_NOTES.md`.)
- **`database/`** — MySQL package: `schema.sql` + `seeds.sql` (idempotent)
  with phpMyAdmin import guide, plus `profluencer_awards_cpanel.sql` and
  `profluencer_awards_full.sql`. See `database/DATABASE_NOTES.md` for the
  judgment calls vs the Laravel migrations (reconcile before go-live).
- **`deploy/`** — cPanel deploy kit: `deploy.yml` workflow inputs,
  `env.production` template, `remote-deploy.sh`, `render-env.php`,
  `public/laravel.php` (API entry point), `public/htaccess-block.txt`.
- **`.github/workflows/deploy.yml`** — on every push to `main`:
  PHP 8.1 tests → build backend vendor (no dev) + React frontend
  (`VITE_API_URL=/api/v1`) → SSH to cPanel → maintenance mode → rsync
  backend into `backend/` inside the domain folder (blocked from web twice:
  `backend/.htaccess` `Require all denied` + root `.htaccess` 403 rule) →
  render `.env` from secrets (`APP_KEY` kept) → `migrate --force` →
  `db:seed --force` → caches → health check `GET /api/v1/health`.

## Folders / data flow

```
browser ──> /                  React build (index.html, assets/, img/)
          /api/v1/*  ──> laravel.php ──> Laravel API ──> MySQL (profluencer_awards)
                                            │
                                            ├─> Sanctum tokens (auth)
                                            ├─> database queue → OTP emails (cron)
                                            └─> settings / snapshots / audit tables
```

- Frontend `src/lib/store.js`: `initStore()` probes `GET <VITE_API_URL>/health`
  (2.5s timeout). API reachable → `mode='api'`; unreachable → error state
  (no silent demo fallback unless `VITE_DEMO_MODE=true`).
- API served under `/api/v1` (`backend/routes/api.php`): 68 `Route::`
  registrations — public, `auth:sanctum`, `role:influencer`, and
  `role:super_admin,admin,editor` groups. (`BACKEND_NOTES.md` verification
  lists 42 routes via `route:list --path=api`.)
- Domain tables (12, `database/schema.sql`): `users`, `categories`,
  `nominees`, `influencer_accounts`, `voters`, `votes`, `nominations`,
  `rsvps`, `enquiries`, `audit_logs`, `settings`, `result_snapshots`.
  Backend has 17 migrations (see DATABASE_NOTES.md for alignment notes).

## Production server layout (per deploy/README.md)

```
~/public_html/profluencerawards.com/   web root
    index.html, assets/, img/          React build
    laravel.php                        API entry point → /api/*
    .htaccess                          our marked block + cPanel rules
    backend/                           Laravel app (403 from web)
        .env (chmod 600), storage/     kept between deploys
```

## Key flows

- Vote: `POST /votes` → `held` + OTP email (queue) → `POST /votes/verify` →
  `counted`. Duplicate email/phone → `409 ALREADY_VOTED`. Idempotency-Key
  supported.
- Nomination: `POST /nominations` → admin review
  (`approved|rejected|changes_requested`); approval creates the nominee.
- Results: publish freezes counted totals into a versioned snapshot;
  public leaderboard uses the snapshot (or live totals while voting);
  unpublish hides results.
