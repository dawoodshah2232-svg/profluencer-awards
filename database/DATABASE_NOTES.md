# DATABASE_NOTES.md — assumptions & known differences vs Laravel migrations

The backend agent is building the Laravel migrations in parallel. This plain-SQL
package was designed from the same spec **without waiting** for that output, so
the notes below record every judgment call. If the migrations differ on any of
these points, reconcile before going live — the two must describe the same
database.

## 1. Primary / foreign key integer type

- SQL package uses `BIGINT UNSIGNED AUTO_INCREMENT` for all `id` columns
  (matches Laravel's `$table->id()`).
- All FK columns are `BIGINT UNSIGNED` to match.
- **If the migrations use signed `bigIncrements` / `unsignedBigInteger`
  mismatches**, the FK types must be aligned or MySQL will refuse the
  constraint (errno 150).

## 2. Timestamps convention

- Regular tables: `created_at` / `updated_at` as `TIMESTAMP NULL DEFAULT NULL`
  (matches Laravel `$table->timestamps()`).
- `audit_logs` and `result_snapshots` have **`created_at` only**, defined as
  `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` so a row always gets a time
  even when inserted manually via phpMyAdmin. If the migrations define these
  as nullable Laravel timestamps, behaviour differs only for manual inserts —
  the application always sets them explicitly.

## 3. ENUMs

- `nominees.status`, `nominations.status`, `votes.status`, `rsvps.guest_type`
  and `users.role` are native MySQL `ENUM`s with the exact value lists from
  the spec.
- If the migrations use `string` columns + application-level validation
  instead, the value sets are identical but the DB won't enforce them.
  Pick one convention and keep it.

## 4. Foreign keys added beyond the letter of the spec

- `result_snapshots.published_by` → FK to `users(id)`, `ON DELETE SET NULL`.
  The spec only said "published_by BIGINT nullable"; the FK is assumed.
- `nominations.category_id` → FK to `categories(id)`, `ON DELETE SET NULL`
  (spec: "category_id FK nullable" — the SET NULL behaviour is assumed).
- `influencer_accounts.user_id` → FK to `users(id)`, `ON DELETE SET NULL`;
  `nominee_id` → FK to `nominees(id)`, `ON DELETE CASCADE`.
- `nominees.category_id`, `votes.voter_id`, `votes.nominee_id`,
  `votes.category_id` → `ON DELETE RESTRICT` (never cascade-delete
  nominees, voters or categories that have votes — the app must invalidate
  instead).
- FK constraint names follow Laravel's `{table}_{column}_foreign` convention
  to ease comparison with `SHOW CREATE TABLE` output.

## 5. Uniqueness choices

- `result_snapshots.version` is `UNIQUE` (assumed — versioned snapshots need
  it; the spec only said "version INT").
- `votes.idempotency_key` is `UNIQUE ... NULL` — MySQL/MariaDB allow multiple
  NULLs in a unique index, so unset keys don't collide.
- `voters.email` and `voters.phone_normalized` are each `UNIQUE`, enforcing
  the "email or phone identifies the voter" rule at the DB level.

## 6. Rules enforced in application code, NOT in the database

Per the spec ("no triggers needed"), these are app-level rules the SQL
package documents but does not enforce:

- `votes` rows are **never deleted** — fraud → `status='invalidated'`.
- `audit_logs` rows are **never updated or deleted** (see README §5 for a
  per-table GRANT recipe that enforces append-only at the DB level).
- `phone_normalized` must be digits-only, country-code normalized
  (e.g. `9715XXXXXXXX`) — normalization happens before insert.
- `nominees.votes_count` is a cached counter maintained by the app.
- `settings.key` values are authoritative in the app (voting windows,
  ceremony details); DB stores them as plain text.

## 7. Seed data choices

- Category slugs: lowercase name with spaces → `-`, keeping "and"
  (e.g. `health-fitness-and-wellness`). If the backend seeds different slugs,
  public vote URLs must use one canonical set.
- `seeds.sql` uses `UTC_TIMESTAMP()` for seed timestamps (server clock may be
  local time; UTC keeps Laravel's `now()` comparisons sane).
- Settings store **dates only** for `voting_start` / `voting_end`
  (`2026-10-20`, `2026-11-30`) because opening/closing *times* are unconfirmed.
  If the backend stores full datetimes, the date-only values remain valid and
  comparable (`2026-10-20` == start of that day).
- `results_published = '0'` and `awards_per_category = '5'` are strings, as
  the `settings.value` column is TEXT; the app casts them.

## 8. Collation / engine

- `ENGINE=InnoDB`, `CHARSET=utf8mb4`, `COLLATE=utf8mb4_unicode_ci` on every
  table — required for FK compatibility and emoji-safe text (handles,
  bios, messages).
- `JSON` columns (`audit_logs.meta`, `result_snapshots.payload`): native on
  MySQL 8; on MariaDB 10.11 `JSON` is accepted as an alias for LONGTEXT with
  a JSON validity check — verified working in the test import below.

## 9. Verified by actual import (not just eyeballing)

- `schema.sql` + `seeds.sql` were imported into a scratch database on local
  MariaDB 10.11.14. All 12 tables created, FKs resolved, seeds inserted.
- Row counts after import: `categories` = 10, `settings` = 7.
- Re-import of both files is idempotent (drops recreate; seeds use
  `INSERT IGNORE`).
