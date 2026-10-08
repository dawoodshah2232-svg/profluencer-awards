# ProFluencer Awards — Design

Luxury dark/gold awards theme, mobile-first. Ported from the reference
static build (`style-v3.css` → `frontend/src/styles.css`).

## Colors (CSS variables, `frontend/src/styles.css`)

- Backgrounds: `--bg:#070b14` (deep navy), `--bg2:#0b1120`
- Cards: `--card:#101828`, `--card2:#0d1424`
- Gold: `--gold:#d4af37`, `--gold-lt:#f3d27a`, `--gold-dk:#9c7a1e`
- Text: `--text:#f5f1e8` (warm white), `--muted:#a9b1c2`
- Dividers: `--line:rgba(212,175,55,.22)` (gold-tinted hairlines)
- Light surfaces: `--light:#faf6ee`, ink `--ink:#141414`
- Radius `--r:18px`; card shadow `0 18px 50px rgba(0,0,0,.45)`

## Typography

- Apple system font stack (see RULES.md). Headings: line-height 1.15,
  letter-spacing -.02em; section titles `clamp(28px,5.4vw,46px)`,
  weight 800.
- Eyebrow labels: gold-light, letter-spacing .28em, uppercase, 11px, 700.

## Buttons / inputs

- `.btn`: pill (radius 999px), padding 14×28, weight 700; press feedback
  `transform:scale(.97)` on `:active`.
- `.btn-gold`: gradient `135deg, gold-lt → gold 55% → gold-dk`, dark text
  `#1a1405`, gold glow shadow.
- `.btn-ghost`: translucent white `rgba(255,255,255,.07)` with 1px border.
- Form fields: dark `#0a0f1d`, 14px radius, 14×16 padding, gold-ish focus
  treatment; font 15px.

## Layout / motion

- Container `max-width:1140px`, padding 0 20px; sections `padding:72px 0`.
- Fixed header (72px) with blur-on-scroll; burger menu below 900px.
- Reveal-on-scroll animations with `prefers-reduced-motion` respected;
  skip link + aria labels on icon-only controls (accessibility).

## Brand rules

- Logo (`public/img/`, e.g. `logo-clean.png`) used raw — no cards, boxes,
  blend/shadow/radius effects on logo rendering.
- No emojis in the UI. No webfont downloads (system stack only).
- Images: `frontend/public/img/` (category art, hero, trophy, ceremony).
- Icons: TODO — no inline-SVG icon system observed in `src/components`
  (Charts.jsx, Countdown.jsx, Layout.jsx, ui.jsx); verify and use
  Heroicons inline SVG only if icons are added.

## Content rules

- Public copy uses dates only for the voting window (Oct 15 – Nov 30,
  2026); ceremony shown as "afternoon session" — no time-of-day claims.
- Charts: lightweight div-based components, no chart library.
- QR codes via `qrcode.react` only.
