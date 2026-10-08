# ProFluencer Awards — Rules (coding standards)

## Stack (owner-fixed)

- Backend = **MySQL + PHP only** (cPanel hosting). No Postgres/Supabase.
- Backend: Laravel 13.x, PHP 8.3, Sanctum, database queue driver.
- Frontend: React 19 + Vite 8, no chart library (div-based charts in
  `src/components/Charts.jsx`), QR via `qrcode.react`.
- Typography: Apple system font stack only:
  `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
  "Helvetica Neue", Helvetica, Arial, "Segoe UI", sans-serif`.
  Never Roboto / Titillium / Montserrat / Open Sans as primary.
- No emojis in the UI (campaign templates are plain text).
- Logos used raw; never on cards or background boxes.

## Conventions found in the repo

- API prefix `/api/v1` from `bootstrap/app.php`; controllers grouped by
  role (`Admin/`, `InfluencerController`, public `DiscoveryController` /
  `PublicController`).
- Throttle middleware on all public write endpoints (`votes`, `otp`,
  `nominations`, `login`); admin actions audit-logged (audit logs are
  read-only — no update/delete routes).
- Migrations: 17 in `backend/database/migrations`; DB types `TIMESTAMP`,
  native MySQL `ENUM`s for status fields; BIGINT UNSIGNED PKs/FKs matching
  Laravel `$table->id()`.
- Seeds are idempotent; `schema.sql`/`seeds.sql` are the cPanel fallback path.
- Tests: `backend/phpunit.xml`; `php artisan test` (11 voting-flow tests at
  last verification). `vendor/bin/pint` for PHP style.
- Frontend lint: `oxlint` (`npm run lint`).
- Demo mode is explicit-only: `VITE_DEMO_MODE=true`. Never set in
  production; never let sample data silently substitute for API data.
- Demo admin credentials (`admin / profluencer2026`) are demo-only and must
  not survive production.

## What AI must do

- Pull latest `main` before any work; merge cleanly; never force-push;
  never `git reset --hard`.
- New schema changes = new migrations. Never edit a migration that has
  already run in production. Keep `database/schema.sql` and the migrations
  describing the same database (see `database/DATABASE_NOTES.md`).
- Every deploy to `main` runs the test suite first (deploy.yml) — keep
  tests green.
- Verify before claiming success; report exact errors, never generic
  "server error".
- Apple-design + web-animations standards for UI work.

## What AI must NOT do

- No auto-deploy of backend without the owner's manual review (standing
  deploy policy — see TASKS.md TODO on the deploy.yml workflow).
- No fake counters/testimonials; no invented stats or dates; ceremony
  venue/time stays unconfirmed until the owner confirms.
- No hardcoded credentials in the repo (secrets via GitHub Secrets /
  server `.env` only).
- No new backend features that need the old infected demo data — the
  localStorage demo repo is legacy reference only.
