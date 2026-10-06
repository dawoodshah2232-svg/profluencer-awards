# ProFluencer Awards — profluencerawards.com

10 industry categories · 50 awards (top 5 per category, rank 1 = Category Winner) ·
public voting Oct 15 – Nov 30, 2026 · ceremony Dec 11, 2026, afternoon, Dubai.

## Structure

```
profluencer-awards/
├── frontend/    React JS (Vite) — public site, voting, influencer portal, admin CRM
├── backend/     PHP Laravel API (Sanctum) — /api/v1, MySQL
└── database/    MySQL — schema.sql + seeds.sql + phpMyAdmin import guide
```

## Local development

**Database** — create `profluencer_awards` in MySQL, then either:
- `mysql profluencer_awards < database/schema.sql && mysql profluencer_awards < database/seeds.sql`, or
- run the Laravel migrations below.

**Backend**
```bash
cd backend
composer install
cp .env.example .env && php artisan key:generate
# edit .env: DB_*, MAIL_*, ADMIN_EMAIL/ADMIN_PASSWORD
php artisan migrate --seed
php artisan serve --port=8000
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000/api/v1
npm run dev            # or: npm run build  -> dist/
```

Demo mode is explicit-only: `VITE_DEMO_MODE=true` enables the built-in
sample-data fallback (static preview). Production builds must NOT set it —
API failures then surface as errors and sample data can never silently
substitute for real API data.

## cPanel deployment

**1. Database** — cPanel → MySQL Database Wizard: create database + user,
grant ALL PRIVILEGES. Then phpMyAdmin → Import `database/schema.sql`,
then `database/seeds.sql` (idempotent; safe to re-run).

**2. Backend (api.profluencerawards.com)**
- Upload `backend/` to `/home/<user>/profluencerawards-api` (above public_html).
- cPanel → Domains: point the API domain's **document root** to
  `/home/<user>/profluencerawards-api/public`.
- SSH or cPanel Terminal in that dir:
  `composer install --no-dev --optimize-autoloader`
- Copy `.env.example` → `.env`, set a strong `APP_KEY`
  (`php artisan key:generate`), DB credentials, `MAIL_*` SMTP,
  `ADMIN_EMAIL` + a strong `ADMIN_PASSWORD`.
- `php artisan migrate --seed --force`
- `chmod -R 775 storage bootstrap/cache`
- cPanel → Cron Jobs (every minute) for the OTP mail queue:
  `* * * * * /usr/local/bin/php /home/<user>/profluencerawards-api/artisan queue:work --stop-when-empty >> /dev/null 2>&1`
  and the scheduler:
  `* * * * * /usr/local/bin/php /home/<user>/profluencerawards-api/artisan schedule:run >> /dev/null 2>&1`

**3. Frontend (profluencerawards.com)**
- `cd frontend && VITE_API_URL=https://api.profluencerawards.com/api/v1 npm run build`
- Upload `frontend/dist/*` to `public_html/`. No server rewrites needed
  (hash routing). Never set `VITE_DEMO_MODE=true` in production.

**4. Email (OTP)** — the vote-verification codes go through Laravel mail.
Set `MAIL_MAILER=smtp` with your provider (cPanel email, Brevo, etc.)
before voting opens. Test with one real vote: the code must arrive.

## Key flows

- **Voting**: POST /api/v1/votes → vote `held` + 6-digit email OTP
  (10-min TTL, 5 attempts, 60s resend cooldown) → POST /votes/verify →
  `counted`. One counted vote per voter per category (email OR phone
  identifies the voter). Unverified votes never count; fraud is
  `invalidated`, never deleted.
- **Nomination**: the Nominate page is influencer self-registration
  (POST /api/v1/auth/register) — profile created as `pending`, admin
  approves from the CRM → appears publicly.
- **Admin CRM**: `/admin` in the frontend, token login via
  POST /api/v1/admin/login, full audit log, versioned result snapshots.

## Security notes

- `backend/.env` is git-ignored and must never be committed.
- Change `ADMIN_PASSWORD` to a strong secret before going live.
- `APP_DEBUG=false` in production (`.env.example` default).
- Rate limits: votes 12/min, OTP 10/min, nominations 5/min, login 10/min per IP.
- CORS is restricted (see `config/cors.php`) — add the production
  frontend origin.
