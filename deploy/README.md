# Deployment — cPanel via GitHub Actions

Every push to `main` runs [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
and puts the frontend, backend and database changes live on
**https://profluencerawards.com**. You can also run it by hand from
**Actions → Deploy to cPanel → Run workflow**.

## What a deploy does

1. **Tests** the Laravel API on PHP 8.1. If a test fails, nothing is deployed.
2. **Builds** the backend `vendor/` (no dev packages) and the React frontend
   (`VITE_API_URL=/api/v1`, so the API is on the same domain).
3. **Over SSH** (the server-side steps are in [`remote-deploy.sh`](remote-deploy.sh)):
   - checks the server's PHP version and extensions, then puts the API in
     maintenance mode. The API answers 503 for a few seconds; the website
     stays up.
   - rsyncs the Laravel app to `~/profluencerawards-backend`, which is
     **outside** `public_html`, so `.env`, `vendor` and logs can't be reached
     from the web.
   - writes `.env` from [`env.production`](env.production), filling in the
     GitHub secrets. `APP_KEY` is kept from the server.
   - copies the React build into the web root and writes `laravel.php` (the
     API entry point) there. It also updates **only** the marked
     `# BEGIN/END ProFluencer Awards` block in `.htaccess`, so rules that
     cPanel added are kept.
   - runs `migrate --force` (new tables, columns and alterations), then
     `db:seed --force`, rebuilds the caches and brings the API back online.
4. **Health check**: `GET /api/v1/health` must return `{"ok":true}`.

If a step fails after maintenance mode is on, the workflow brings the API
back online automatically.

### Server layout

```
~/profluencerawards-backend/          Laravel app (CPANEL_APP_PATH to override)
    .env                              written by the workflow (chmod 600)
    storage/                          logs, cache: kept between deploys
~/public_html/profluencerawards.com/  web root (CPANEL_PATH)
    index.html, assets/, images/      React build
    laravel.php                       API entry point → /api/*
    .htaccess                         our block + anything cPanel added
```

### Database changes

- **Schema changes** need a new migration in `backend/database/migrations/`.
  Never edit a migration that has already run in production; add a new one
  instead. Every deploy runs it.
- **Seeders run on every deploy, so keep them idempotent:**
  - `CategorySeeder`: `updateOrCreate`, so the code is the source of truth.
  - `SettingSeeder`: only inserts missing keys. Values the admin changed are
    kept.
  - `AdminUserSeeder` / `DemoInfluencerSeeder`: only create the user if it is
    missing. A password changed later is never reset.

## GitHub secrets

Add these under **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Required | Value |
|---|---|---|
| `CPANEL_HOST` | yes | Server shared IP (cPanel right sidebar → *Shared IP Address*) or hostname |
| `CPANEL_PORT` | yes | `22` |
| `CPANEL_USER` | yes | cPanel username (`whoami` in cPanel Terminal) |
| `CPANEL_SSH_KEY` | yes | Full private key text, including the `-----BEGIN … KEY-----` and `-----END … KEY-----` lines |
| `CPANEL_SSH_PASSPHRASE` | if the key has one | Key password set when the key was generated |
| `CPANEL_PATH` | yes | Web root, e.g. `/home/<user>/public_html/profluencerawards.com` |
| `CPANEL_DB_PASSWORD` | yes | Password of MySQL user `profluencer_awards` |
| `ADMIN_PASSWORD` | yes | Admin login password (created once) |
| `DEMO_USER_PASSWORD` | yes | Demo influencer login password (created once) |
| `MAIL_PASSWORD` | recommended | Password of `noreply@profluencerawards.com`. If empty, mail goes through the server's `sendmail` |
| `CPANEL_PHP` | optional | PHP CLI path if auto-detect fails, e.g. `/opt/cpanel/ea-php81/root/usr/bin/php` |
| `CPANEL_APP_PATH` | optional | Laravel folder (default `~/profluencerawards-backend`; must be outside the web root) |

Non-secret production settings (`APP_URL`, DB name/user, mail host, …) are in
[`env.production`](env.production). Edit that file and push to change them.

## One-time cPanel setup

1. **SSH key**: cPanel → *SSH Access* → *Manage SSH Keys* → **Authorize** the key.
2. **PHP**: cPanel → *MultiPHP Manager* → set the domain to **PHP 8.1**.
   Then *Select PHP Version* → *Extensions*: enable `pdo_mysql`, `mbstring`,
   `openssl`, `fileinfo`, `bcmath`, `curl`, `intl`, `zip`.
3. **Database**: must be **empty** before the first deploy, or contain an
   import of `database/profluencer_awards_cpanel.sql`. Do **not** import
   `database/schema.sql`: it has no `migrations` table, so `migrate` would
   fail with "table already exists".
4. **Cron** (cPanel → *Cron Jobs*, every minute). The OTP emails are queued
   and are only sent when this runs:
   ```
   cd ~/profluencerawards-backend && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1; cd ~/profluencerawards-backend && /usr/local/bin/php artisan queue:work --stop-when-empty --max-time=50 >> /dev/null 2>&1
   ```
5. **SSL**: cPanel → *SSL/TLS Status* → *Run AutoSSL*.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Could not reach … over SSH` | Check `CPANEL_HOST`/`CPANEL_PORT`. SSH access may need enabling with the host. |
| `Permission denied (publickey)` | Key not **Authorized** in cPanel, or the wrong key/passphrase in the secrets. |
| `no PHP 8.1–8.3 CLI found` | Set `CPANEL_PHP` (`ls /opt/alt/ \| grep php` or `ls /opt/cpanel/ \| grep php` in Terminal). |
| `rsync is not installed` | Ask the host to enable rsync for SSH users. |
| `Access denied for user` in migrate | Wrong `CPANEL_DB_PASSWORD`, or the user isn't added to the database with ALL PRIVILEGES. |
| Health check fails but the steps passed | DNS/SSL not ready yet. Open the site; check `~/profluencerawards-backend/storage/logs/laravel.log`. |
| OTP email never arrives | Cron job missing, or `MAIL_PASSWORD` wrong. Check `laravel.log` and the `failed_jobs` table. |
