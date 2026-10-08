# ProFluencer Awards — Tasks

Status: done / in-progress / TODO. Unknowns are TODO, not guesses.

## Done

- [x] Full-stack rebuild (React 19 frontend + Laravel 13 API + MySQL),
  commit 7a5c1af (2026-10-06).
- [x] Voting flow verified locally: held → OTP email via queue →
  counted; duplicates blocked; 11 phpunit tests green.
- [x] Admin CRM (9 tabs), influencer portal, email-OTP voting, influencer
  self-registration with admin approval.
- [x] GitHub Actions deploy pipeline to cPanel (`deploy.yml`,
  `deploy/`, commits db7a93f, 3c717c7).
- [x] Plain-SQL package (`database/schema.sql`, `seeds.sql`,
  `profluencer_awards_cpanel.sql`, `profluencer_awards_full.sql`).
- [x] Backend hardening (tip): EmailHeaderInjectionTest, NoLineBreaks
  validation rule, DemoInfluencerSeeder.

## In progress

- [ ] First production deploy via the Actions pipeline (domain
  profluencerawards.com) — verify health check returns
  `{"ok":true}` live.
- [ ] Live verification pass: 42 API routes on production; one full
  end-to-end vote with a real email.

## TODO

- [ ] **Deploy-policy conflict (owner decision):** `.github/workflows/deploy.yml`
  auto-deploys the BACKEND on every push to `main`, but the standing owner
  policy is "backend is NEVER auto-deployed — manual security review, then
  Kailash deploys". Owner must decide: restrict the workflow to frontend,
  keep backend manual, or formally approve backend auto-deploy.
- [ ] Real SMTP credentials (MAIL_*): email OTP cannot be delivered in
  production without them.
- [ ] CAPTCHA integration (backend notes list it as frontend + future work).
- [ ] Ceremony venue/time confirmation (Dec 11, 2026 afternoon, Dubai —
  venue UNCONFIRMED; never publish as confirmed).
- [ ] Password-reset endpoint (table exists; flow not exposed).
- [ ] Results dual-approval as a two-signature code flow (currently a
  process rule).
- [ ] Reconcile `database/schema.sql` judgment calls with the 17 Laravel
  migrations before go-live (see `database/DATABASE_NOTES.md`).
- [ ] Refresh the stale note in `frontend/FRONTEND_NOTES.md` ("The Laravel
  API does not exist yet") — the API exists and is verified.
- [ ] Icon system: confirm no icon usage, adopt Heroicons inline SVG only
  if icons are added.
- [ ] Category seeds: confirm final 10 category names/descriptions with
  owner before seeding production.
