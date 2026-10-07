# ProFluencer Awards — API Backend

Laravel 10 API backend for **profluencerawards.com** (ProFluencer Awards 2026).
Serves the React frontend at `/api/v1`. MySQL database. Built for cPanel
shared hosting: plain PHP, no Octane, no Horizon — the queue runs on the
`database` driver.

## Requirements

- PHP 8.1+ (8.1 / 8.2 / 8.3) with extensions: mbstring, xml, curl, mysqlnd/pdo_mysql, zip, bcmath, fileinfo, openssl
- Laravel 10.x (end-of-life — see the version note in `BACKEND_NOTES.md`)
- Composer 2
- MySQL 8 / MariaDB 10.4+

## Local setup

```bash
cd backend

# 1. Install dependencies
composer install

# 2. Configure environment
cp .env.example .env
php artisan key:generate

# 3. Create the database, then point .env at it:
#    DB_CONNECTION=mysql
#    DB_HOST=127.0.0.1
#    DB_PORT=3306
#    DB_DATABASE=profluencer_awards
#    DB_USERNAME=...
#    DB_PASSWORD=...

# 4. Migrate + seed (10 categories, base settings, first admin user)
#    Set ADMIN_EMAIL / ADMIN_PASSWORD in .env first (password is hashed).
php artisan migrate --seed

# 5. Serve
php artisan serve          # http://localhost:8000/api/v1/health
```

Seeded admin: `ADMIN_EMAIL` from `.env` (default `admin@profluencerawards.com`).
Log in via `POST /api/v1/auth/login` to get a Sanctum Bearer token.

Useful commands:

```bash
php artisan route:list --path=api   # all /api/v1 routes
php artisan test --compact          # feature tests (sqlite, in-memory)
vendor/bin/pint --dirty             # code style
```

## How voting works (summary)

`POST /api/v1/votes` → vote created as `held` → 6-digit OTP emailed →
`POST /api/v1/votes/verify` → vote becomes `counted`. Unverified votes never
count. One counted/held vote per voter per category — email **or** phone
identifies the voter (both unique, phone normalized to digits). Full details
in `BACKEND_NOTES.md`.

## cPanel deployment

1. **Upload**: copy the `backend/` directory to the server, e.g.
   `/home/<user>/profluencerawards-api`. Exclude `node_modules` (there are
   none — API only) and `.git`.

2. **Install dependencies** (SSH or Terminal in cPanel):
   ```bash
   cd ~/profluencerawards-api
   composer install --no-dev --optimize-autoloader
   ```

3. **Environment**: copy `.env.example` to `.env` and set:
   - `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://api.profluencerawards.com`
   - `DB_*` to the database created in cPanel → MySQL Databases
   - `MAIL_*` to the SMTP account from cPanel → Email Accounts
     (or `MAIL_MAILER=sendmail`)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the first admin, `FRONTEND_URL`

   Then:
   ```bash
   php artisan key:generate
   php artisan migrate --seed --force
   php artisan config:cache
   php artisan route:cache
   php artisan event:cache
   ```
   Clear the admin password from `.env` afterwards (`ADMIN_PASSWORD=`).

4. **Document root**: point the api subdomain/domain to
   `~/profluencerawards-api/public`. Ensure `public/.htaccess` is present
   (ships with Laravel) so all requests route through `index.php`.

5. **Queue worker (OTP emails)** — database driver, no daemon needed.
   Add a cron job (cPanel → Cron Jobs, every minute):
   ```cron
   * * * * * /usr/local/bin/php /home/<user>/profluencerawards-api/artisan queue:work --stop-when-empty >> /dev/null 2>&1
   ```
   And the scheduler (used for future maintenance tasks):
   ```cron
   * * * * * /usr/local/bin/php /home/<user>/profluencerawards-api/artisan schedule:run >> /dev/null 2>&1
   ```
   Use the PHP binary from cPanel → MultiPHP Manager (`/usr/local/bin/php`
   or `/opt/cpanel/ea-php81/root/usr/bin/php`).

6. **Storage permissions**:
   ```bash
   chmod -R 775 storage bootstrap/cache
   ```

7. **(Optional, recommended)** — make `audit_logs` append-only at the
   database level by granting the app user only `INSERT, SELECT` on it:
   ```sql
   REVOKE UPDATE, DELETE ON profluencer_awards.audit_logs FROM 'app_user'@'localhost';
   GRANT INSERT, SELECT ON profluencer_awards.audit_logs TO 'app_user'@'localhost';
   ```
   The application already refuses updates/deletes in code.

## Repository layout

```
profluencer-awards/
├── frontend/    # React app (separate agent)
├── backend/     # this Laravel API
└── database/    # plain-SQL schema.sql + seeds.sql (phpMyAdmin import)
```

`database/schema.sql` describes the same tables as the Laravel migrations —
see `BACKEND_NOTES.md` for the two deliberate differences.
