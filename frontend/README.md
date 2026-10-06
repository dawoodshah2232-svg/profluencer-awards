# ProFluencer Awards — React frontend

Vite + React (JS) + React Router (hash routing — no server rewrites needed).

## Pages

`/` Home · `/categories` · `/nominees` · `/nominee/:id` (+ voting + OTP) ·
`/nominate` (influencer self-registration) · `/winners` · `/event` (+RSVP) ·
`/sponsors` · `/contact` · `/voting` (rules) · `/news`, `/news/:slug` ·
`/about` · `/faq` · `/terms` · `/privacy` · `/login` · `/dashboard`
(influencer portal: momentum, milestones, campaign toolkit, ceremony) ·
`/admin` (9-tab organiser CRM) · `*` 404.

## Data layer

`src/lib/store.js` is the single data API the pages use.

- **Production** (default): every call goes to the Laravel API
  (`VITE_API_URL`, all under `/api/v1`). Failures surface as errors —
  pages render error states and the shell shows a connectivity banner.
- **Demo** (`VITE_DEMO_MODE=true`): when the API is unreachable the app
  falls back to the built-in sample store (`src/lib/demoData.js`,
  localStorage, clearly labelled "Demo preview"). Powers the static
  GitHub Pages preview. Never enable in production.

`src/lib/api.js` normalizes transport details (snake_case →
`categoryId`/`votes`, settings keys, snapshot shape) so pages never
depend on API field naming.

## Develop / build

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000/api/v1
npm run dev
npm run build          # -> dist/ (upload to cPanel public_html as-is)
```

Production build: `VITE_API_URL=https://api.profluencerawards.com/api/v1 npm run build`
