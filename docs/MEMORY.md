# ProFluencer Awards — Memory (progress log)

## Done

- 2026-10-06 — Full-stack rebuild committed (7a5c1af): React 19/Vite
  frontend, Laravel 13 API (Sanctum), MySQL package; 68 route
  registrations under /api/v1; email-OTP voting (held→OTP→counted);
  influencer self-registration (pending → admin approval creates
  nominee); 9-tab admin CRM. 11 phpunit tests green; migrations clean on
  MariaDB 10.11; e2e smoke vs MySQL passed, smoke data removed.
- 2026-10-06 (later) — GitHub Actions cPanel deploy pipeline added
  (db7a93f): test → build → SSH deploy → migrate → health check.
  Domain layout: React build at web root, Laravel in `backend/`
  (403 from web), API entry `laravel.php`.
- 2026-10-08 — Backend moved into the domain folder, old copy removed
  (3c717c7). Tip includes `deploy/` kit, `database/profluencer_awards_cpanel.sql`,
  `database/profluencer_awards_full.sql`, EmailHeaderInjectionTest,
  NoLineBreaks rule, DemoInfluencerSeeder.
- 2026-10-08 — AI context docs added (`docs/`: PRD, ARCHITECTURE, RULES,
  DESIGN, TASKS, MEMORY) — this file.

- 2026-10-09 — Admin CRM + influencer dashboard rebuilt as sidebar panel
  apps (`PanelShell`, `src/admin.css`, `src/pages/admin/*`); routes
  `/admin/:section`, `/dashboard/:section`. Admin now has full CRUD:
  nominees, categories (+tagline/image_url), news / sponsor tiers / FAQs
  (`site_contents` table, `SiteContentSeeder`), users & logins
  (`/admin/users`, super_admin/admin only), RSVP delete/undo check-in,
  enquiry delete, editable dates incl. `ceremony_time`. Public pages read
  dates/content from the API; home countdown targets the ceremony
  (Dec 11, 2026). `CategorySeeder` is now insert-only (deploy runs
  db:seed). `php artisan pfa:user <email> --role=…` creates/resets logins.
  Header logo enlarged (80px desktop).

## In progress

- First production deploy through the Actions pipeline; live health
  check `GET /api/v1/health`.
- Live verification: full voting round-trip with real email on
  profluencerawards.com.

## Next

- Owner decisions (blockers): real SMTP creds, CAPTCHA, ceremony
  venue/time, deploy-policy conflict (auto-deploy vs manual backend
  review — see TASKS.md).
- Password-reset endpoint, results dual-approval flow (if required).
- Final category content sign-off; production seed.

## Notes for future agents

- Read these docs + `backend/BACKEND_NOTES.md`,
  `frontend/FRONTEND_NOTES.md`, `database/DATABASE_NOTES.md` before
  writing code. Update TASKS.md/MEMORY.md as work completes.
- The old `influencer-awards` repo (localStorage demo) is legacy
  reference only — never merge its demo data into this codebase.
- Version note: backend is Laravel 13.x (not 11) because Composer
  refused 11.x on published security advisories (see BACKEND_NOTES.md).
