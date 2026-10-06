# ProFluencer Awards — Frontend Notes

React (Vite) frontend for ProFluencer Awards 2026. Ported from the reference
static build (`influencer-awards/` repo): same gold/dark luxury design, same
content, same demo behaviour — rebuilt as a component app.

## Quick start

```bash
cd frontend
cp .env.example .env        # set VITE_API_URL to your Laravel API
npm install
npm run dev                 # dev server
npm run build               # production build -> dist/ (static files only)
```

`dist/` is plain static files — servable from GitHub Pages, cPanel
`public_html`, or any static host. `vite.config.js` sets `base: './'` so it
works from a sub-path, and routing uses `HashRouter` so no server rewrites
are needed.

## Routes

| Route | Page |
|---|---|
| `/` | Home (hero, countdown, stats, steps, categories, trophy, ceremony, FAQ) |
| `/categories` | 10 industry categories with nominee counts |
| `/nominees` | Nominee directory (search + category/platform filters, `?cat=` preset) |
| `/nominee/:id` | Nominee profile + voting form (name/email/phone, duplicate protection, email-OTP step in API mode) |
| `/vote/:id` | Redirects to `/nominee/:id` (legacy link compatibility) |
| `/nominate` | Nomination form (identity, category, profiles, consent) |
| `/winners` | Published results (top 5 per category) or "pending" state |
| `/event` | Ceremony details + RSVP form |
| `/sponsors` | Partnership tiers + deck-request form |
| `/contact` | Contact form (routes to enquiries) |
| `/voting` | Official voting rules (9 rules) |
| `/news`, `/news/:slug` | News index + 3 articles |
| `/about`, `/faq` | About the awards, FAQ |
| `/terms`, `/privacy` | Terms & voting rules, privacy policy |
| `/login` | Influencer login + demo profile picker |
| `/dashboard` | Influencer dashboard (momentum, milestones, voting link + QR, campaign toolkit, ceremony) |
| `/admin` | Organiser CRM, 9 tabs (see below) |

## The Admin CRM (`/admin`)

Demo gate: `admin / profluencer2026` (demo only — must not survive production;
production uses server sessions + MFA). Tabs:

1. **Overview** — edition timeline, 8 KPIs, integrity spike alert, 14-day
   votes chart, votes-by-category bars, nominations-by-status, activity feed.
2. **Nominations** — per-category approval chips, search/status/category
   filters, bulk approve / request-changes / reject, per-row actions.
3. **Voters** — 6 KPIs + 7-day new-voter chart (privacy note included).
4. **Votes** — 24h velocity chart, status filter, vote ledger, invalidate
   action, CSV export.
5. **Results** — publish/unpublish (type PUBLISH to confirm), snapshot
   version history, per-category top 5.
6. **RSVP** — totals, check-in progress, guest list, check-in toggle, CSV.
7. **Enquiries** — unread/total KPIs, mark-read.
8. **Settings** — edition name, venue line, terms version; danger-zone demo
   reset.
9. **Audit Log** — append-only audit trail.

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Laravel API base. All requests go to `<VITE_API_URL>/…` |

## How the demo fallback works

`src/lib/store.js` exposes one async `Store` API used by every page.

- On boot, `initStore()` probes `GET <VITE_API_URL>/health` (2.5s timeout).
- **API reachable** → `mode = 'api'`: every `Store.*` call hits the Laravel
  REST endpoints (see "API contract" below). Tokens are stored in
  `localStorage` (`pfa_api_token`, `pfa_api_admin_token`).
- **API unreachable** → `mode = 'demo'`: every `Store.*` call resolves from
  `src/lib/demoData.js` — the ES-module port of the reference `data.js`
  (same localStorage keys `pfa_db_v2`, 50 seeded sample nominees, same
  voting/duplicate-protection logic). A "Demo preview" banner is shown and
  demo-only surfaces are labelled. This is what powers the GitHub Pages
  preview with zero backend.

Pages never branch on the backend themselves (except tiny demo labels);
`useAsync` in `src/lib/hooks.jsx` re-runs store calls if the mode flips.

Voting flow: in API mode, `POST /votes` returns `{ ok, otp_required,
hold_id }` — the vote is **held** and the UI shows the email-OTP step;
`POST /votes/verify` counts it. In demo mode the vote counts immediately
(no mailer exists in a static build) and the form says so.

## API contract (for the Laravel backend)

Base: `/api/v1`. JSON. Admin routes need `Authorization: Bearer <token>`.

- `GET /health` → liveness probe
- `GET /categories`, `GET /categories/:id/stats`, `GET /categories/:id/top5`
- `GET /settings`, `PATCH /admin/settings`
- `GET /voting/state` → `{ state: 'upcoming'|'open'|'closed' }`
- `GET /nominees?status=approved&category=:id`, `GET /nominees/:id`,
  `GET /nominees/:id/analytics?window_ms=…`, `GET /nominees/:id/votes`
- `POST /nominations`, `PATCH /admin/nominations/:id` `{status, review_notes}`,
  `DELETE /admin/nominations/:id`, `GET /admin/nominees`
- `POST /auth/login {email,password}` → `{token, nominee}`,
  `GET /auth/me`, `POST /auth/logout`
- `POST /admin/login {username,password}` → `{token}`, `POST /admin/logout`
- `POST /votes {nominee_id,name,email,phone}` → `{ok, otp_required, hold_id}` or `{ok:false, code}`,
  `POST /votes/verify {hold_id, code}`, `POST /votes/resend-otp {hold_id}`,
  `GET /votes/my-choice?category=:id`
- `GET /admin/votes?limit=`, `POST /admin/votes/:id/invalidate {reason}`
- `GET /admin/voters/stats`, `GET /admin/analytics/votes-per-hour`,
  `GET /admin/analytics/new-voters-per-day`, `GET /admin/analytics/blocked-attempts`,
  `GET /analytics/votes-per-day?days=&nominee_id=`, `GET /analytics/votes-by-category`
- `POST /admin/results/publish`, `DELETE /admin/results`, `GET /results`
- `POST /rsvps`, `GET /admin/rsvps`, `POST /admin/rsvps/:id/checkin`
- `POST /enquiries`, `GET /admin/enquiries`, `PATCH /admin/enquiries/:id {read}`
- `GET /admin/audit?limit=`, `GET /admin/export/:kind` (blob download)

Response shape: `{ data: … }` or a bare value — both are accepted.

## Design notes

- Apple system font stack, gold (`#d4af37`) on deep navy (`#070b14`),
  mobile-first responsive. No emojis in the UI (campaign templates are
  plain text).
- Charts are lightweight div-based components (`src/components/Charts.jsx`) —
  no chart library. QR codes use `qrcode.react` (tiny, no deps).
- Images live in `public/img/` (copied from the reference build).
- Public copy uses dates only for the voting window (Oct 15 – Nov 30, 2026)
  and "afternoon session" for the ceremony — no time-of-day claims.
- Accessibility: skip link, aria labels on icon-only controls, `prefers-reduced-motion`
  respected for reveal animations.

## What is stubbed / known limits

- The Laravel API does not exist yet — all API-mode paths are mapped but
  untested against a real server. Demo mode is fully working.
- Demo admin credentials (`admin / profluencer2026`) are demo-only.
- Demo votes/OTP: no real email is sent; votes count instantly in demo mode.
- `photo` upload on the nominate form stores a data-URL locally (demo);
  production should upload to the API.
- News articles are static content ported from the reference build.
