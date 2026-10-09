# ProFluencer Awards — PRD

ProFluencer Awards 2026 (profluencerawards.com): a public awards platform for
influencers and content creators. 10 industry categories, 50 awards (top 5
per category; rank 1 = Category Winner).

## Confirmed dates

- Public voting: **Oct 20 – Nov 30, 2026** (from `database/seeds.sql`).
- Ceremony: **Dec 11, 2026, afternoon, Dubai**.
- Venue/time UNCONFIRMED — never present as confirmed. Public copy must not
  make time-of-day claims beyond "afternoon session".

## Users

- **Public voters** — browse nominees, vote (email-OTP verified), view
  leaderboards and published results.
- **Influencers** — self-register (creates a `pending` nominee), login,
  dashboard with stats, rank, momentum, milestones, voting link + QR,
  campaign toolkit.
- **Nominees** — approved influencers listed per category.
- **Organisers / admins** — 9-tab CRM: overview, nominations review,
  voters, votes (invalidate), results publish, RSVP check-in, enquiries,
  settings, audit log. Roles: `super_admin`, `admin`, `editor`.

## Features (what exists in the repo)

- Public site: home, categories, nominee directory + profiles, voting with
  email OTP (held → OTP → counted), nomination form, ceremony RSVP, sponsors,
  contact/enquiries, voting rules, news (3 articles), about/FAQ/terms/privacy.
- Voting integrity: rate limiters, idempotency keys, duplicate email/phone
  blocking (409), vote invalidation with reason, audit log (append-only),
  versioned result snapshots.
- Influencer portal: stats, category leaderboard, milestones 10→1000.
- Admin CRM: KPI dashboard, nomination approval (approved creates nominee),
  voter directory, vote ledger + CSV, results publish/unpublish ("type
  PUBLISH" confirm), RSVP check-in + CSV, enquiries inbox, allow-listed
  settings, append-only audit.
- Demo mode: explicit-only (`VITE_DEMO_MODE=true`); production builds must
  NOT set it — API failures surface as errors, sample data can never silently
  substitute.

## Non-goals / known limits (from BACKEND_NOTES.md)

- SMS OTP intentionally not built — email OTP only; phone is a uniqueness
  identifier.
- Results "dual approval" is a process rule, not a two-signature code flow.
- CAPTCHA / device fingerprinting / automated spike response: not built.
- Password-reset endpoint not exposed (table exists).
- Ceremony venue/time not confirmed — TODO with owner.
