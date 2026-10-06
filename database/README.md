# ProFluencer Awards — Database Package

Plain-SQL companion to the Laravel backend migrations. Same tables, columns and
indexes — for cPanel hosting where you want to set up the database via
phpMyAdmin **without** running Laravel migrations.

**Files**

| File | Purpose |
|---|---|
| `schema.sql` | Creates all 12 tables (with foreign keys) in dependency order. Safe to re-run. |
| `seeds.sql` | Inserts the 10 award categories + 7 base settings rows. Safe to re-run (`INSERT IGNORE`). |
| `DATABASE_NOTES.md` | Assumptions and known differences vs the Laravel migrations. Read this first if something doesn't match. |

---

## 1. Create the database and user (cPanel MySQL Database Wizard)

1. Log in to **cPanel** → open **MySQL Database Wizard** (under *Databases*).
2. **Step 1 — Create a database**, e.g. `awards_profluencer` → *Next Step*.
   (cPanel prefixes it with your account name, e.g. `myaccount_awards_profluencer` — note the full name.)
3. **Step 2 — Create a user**, e.g. `awards_app`, and set a **strong password**.
   Save the password somewhere safe (password manager) — the Laravel `.env` needs it.
4. **Step 3 — Add user to database**: tick **ALL PRIVILEGES** → *Next Step*.
   (ALL PRIVILEGES is needed for the initial import; you can tighten later — see §5.)
5. Note down three values for the Laravel `.env`:
   - `DB_DATABASE` = full database name from step 2
   - `DB_USERNAME` = full username from step 3
   - `DB_PASSWORD` = the password you set

## 2. Import the schema (phpMyAdmin)

1. cPanel → **phpMyAdmin**.
2. In the left sidebar, click your new database name.
3. Click the **Import** tab at the top.
4. **Choose File** → select `schema.sql` from this folder → **Go**.
5. You should see "Import has been successfully finished" and 12 new tables
   in the left sidebar.

## 3. Import the seeds

1. Still in phpMyAdmin with your database selected → **Import** tab again.
2. **Choose File** → select `seeds.sql` → **Go**.
3. Verify: open the `categories` table → **Browse** → you should see **10 rows**.
   Open `settings` → **Browse** → **7 rows**.

> If you ever need a completely fresh start, just re-import `schema.sql`
> (it drops and recreates everything — **this deletes all data**), then
> re-import `seeds.sql`.

## 4. Point Laravel at this database

In the Laravel project's `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=myaccount_awards_profluencer
DB_USERNAME=myaccount_awards_app
DB_PASSWORD=your-strong-password-here
```

Then run `php artisan migrate --force` on first deploy. Because the schema
already matches the migrations, Laravel will detect the existing tables…
**unless** the `migrations` bookkeeping table is missing, in which case
`migrate` will try to re-create tables and fail.

Pick **one** of these two approaches (do not mix):

- **Option A — SQL only (recommended for cPanel):** import `schema.sql` +
  `seeds.sql` via phpMyAdmin and **never run `php artisan migrate`** on this
  database. Future schema changes come as new `.sql` patch files.
- **Option B — Laravel owns the schema:** skip the SQL import entirely and run
  `php artisan migrate --seed` so Laravel creates everything itself.

## 5. Hardening (optional, recommended)

- `audit_logs` is append-only by application rule. To enforce it in the
  database, create a restricted MySQL user for the app with only
  `INSERT, SELECT` on `audit_logs` (cPanel → MySQL Databases → modify privileges
  is per-database; use phpMyAdmin → User accounts for per-table grants).
- `votes` rows must **never be deleted** — fraud is handled by setting
  `status = 'invalidated'` with `invalidated_reason`. Do not delete rows
  manually; it destroys the audit trail.

## 6. How the SQL files map to the Laravel migrations

| SQL table | Laravel migration (expected name) | Laravel seeder |
|---|---|---|
| `users` | `create_users_table` | — (create admin manually) |
| `categories` | `create_categories_table` | `CategorySeeder` (10 rows) |
| `nominees` | `create_nominees_table` | — |
| `influencer_accounts` | `create_influencer_accounts_table` | — |
| `voters` | `create_voters_table` | — |
| `votes` | `create_votes_table` | — |
| `nominations` | `create_nominations_table` | — |
| `rsvps` | `create_rsvps_table` | — |
| `enquiries` | `create_enquiries_table` | — |
| `audit_logs` | `create_audit_logs_table` | — |
| `settings` | `create_settings_table` | `SettingSeeder` (7 rows) |
| `result_snapshots` | `create_result_snapshots_table` | — |

If the backend team renames a migration, the table list above is the source of
truth for what must exist. Any drift is documented in `DATABASE_NOTES.md`.

## Troubleshooting

- **"Unknown collation"** — your MySQL is older than 5.7/10.2. Ask the host to
  enable `utf8mb4`, or replace `utf8mb4_unicode_ci` with `utf8mb4_general_ci`.
- **"Cannot add foreign key constraint"** — tables must all be InnoDB with the
  same charset; `schema.sql` already handles this. Don't mix imports from other
  sources that create MyISAM tables.
- **Import file too large** — phpMyAdmin upload limit (often 50 MB). These files
  are tiny; if you hit the limit on a host, use cPanel → *MySQL Databases* →
  *phpMyAdmin* still, or ask the host to raise `upload_max_filesize`.
- **"Duplicate entry" on re-import of seeds** — harmless; `INSERT IGNORE`
  skips existing rows.
