/* ProFluencer Awards — unified data store.
   Every function is async and has ONE code path, chosen explicitly:

   DEMO MODE (VITE_DEMO_MODE=true — static preview / local demo builds only):
     1. If the Laravel API is reachable (VITE_API_URL), the call goes to
        /api/v1 and the server is the source of truth.
     2. Otherwise it falls back to the built-in DEMO store (localStorage,
        seeded sample data, clearly labelled demo data) so the static build
        works standalone — this is what powers the GitHub Pages preview.

   PRODUCTION (VITE_DEMO_MODE unset or anything but "true"):
     Every call goes to the Laravel API. API failures surface as errors
     (pages render error states; the shell shows a connectivity banner).
     Demo data can NEVER silently substitute for failed production API
     data — the demo store is unreachable in this mode.

   Pages call Store.* and never care which backend answered. */

import { Demo, fmt, initials, fmtTime } from './demoData'
import { demoContent } from '../data/content'
import { API_BASE, ApiError, api, apiAvailable, tokens } from './api'

/* Explicit opt-in only. Never default this to true. */
const DEMO_ENABLED = import.meta.env.VITE_DEMO_MODE === 'true'
export const isDemoMode = () => DEMO_ENABLED && mode === 'demo'

let mode = DEMO_ENABLED ? 'demo' : 'api' // 'demo' | 'api'
const subs = new Set()
export const getMode = () => mode
export function subscribeMode(fn) {
  subs.add(fn)
  return () => { subs.delete(fn) }
}

/* Probe once at boot. In demo-enabled builds this upgrades to live API
   mode when the server answers; in production builds the mode is always
   'api' and the probe is skipped (the API is required, not optional). */
export async function initStore() {
  if (!DEMO_ENABLED) return
  try {
    if (await apiAvailable()) {
      mode = 'api'
      subs.forEach((f) => f('api'))
    }
  } catch { /* stay in demo mode */ }
}

const asApi = (apiCall) => apiCall()
const asDemo = (fn) => {
  if (!DEMO_ENABLED) throw new ApiError(0, 'Service unavailable — please try again')
  return Promise.resolve().then(fn)
}
/* Production: always the API. Demo builds: API when reachable, else demo. */
const call = (demoFn, apiFn) => {
  if (mode === 'api' || !DEMO_ENABLED) {
    if (!apiFn) throw new ApiError(0, 'Service unavailable — please try again')
    return asApi(apiFn)
  }
  return asDemo(demoFn)
}

/* Normalize API list responses: accept {data:[...]} or bare arrays. */
const listOf = (r) => (Array.isArray(r) ? r : (r && r.data) || [])
const oneOf = (r) => (r && r.data) || r

/* API <-> frontend shape adapter. The Laravel API speaks snake_case with
   integer ids; the pages speak the demo shape (categoryId, votes, img,
   tagline). Every API-mode response passes through these mappers so the
   pages never depend on transport details. */
const demoCatByName = Object.fromEntries((Demo.CATEGORIES || []).map((c) => [c.name, c]))
/* Bundled artwork for the seeded category slugs; admin-set image_url wins. */
const CAT_IMG_BY_SLUG = {
  'fashion-and-beauty': 'img/cat-fashion.jpg', 'lifestyle-and-entertainment': 'img/cat-entertainment.jpg',
  'travel-and-hospitality': 'img/cat-travel.jpg', 'food-and-dining': 'img/cat-food.jpg',
  'health-fitness-and-wellness': 'img/cat-fitness.jpg', 'business-and-entrepreneurship': 'img/cat-business.jpg',
  'finance-trading-and-crypto': 'img/cat-finance.jpg', 'technology-and-innovation': 'img/cat-tech.jpg',
  'real-estate-and-home': 'img/cat-realestate.jpg', 'education-parenting-and-family': 'img/cat-education.jpg',
}
const normCategory = (c) => {
  if (!c || c.img !== undefined) return c
  const d = demoCatByName[c.name] || {}
  return {
    ...c,
    img: c.image_url || CAT_IMG_BY_SLUG[c.slug] || d.img || 'img/trophy.jpg',
    tagline: c.tagline || d.tagline || c.description || '',
    desc: c.description || d.desc || '',
  }
}

/* Admin list adapters: API rows -> the shapes the CRM renders. Demo rows
   already carry these keys and pass through untouched. */
const normRsvp = (r) => (r.at !== undefined ? r : {
  ...r, type: r.guest_type || 'guest', guests: r.guests_count || 1,
  checkedIn: !!r.checked_in_at, checkedInAt: r.checked_in_at, at: r.created_at,
})
const normEnquiry = (e) => (e.at !== undefined ? e : { ...e, read: !!e.read_at, at: e.created_at })
const normVote = (v) => (v.at !== undefined ? v : {
  ...v, at: v.created_at,
  nomineeId: v.nominee_id ?? v.nominee?.id, nomineeName: v.nominee?.name,
  categoryId: v.category_id ?? v.category?.id, categoryName: v.category?.name,
  voterId: v.voter?.id, voterName: v.voter?.name, voterEmail: v.voter?.email,
})
const auditDetail = (meta) => {
  if (!meta || typeof meta !== 'object') return ''
  return Object.entries(meta)
    .filter(([, v]) => v !== null && v !== '' && typeof v !== 'object')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ')
}
const normAudit = (a) => (a.at !== undefined ? a : {
  ...a, at: a.created_at,
  actor: a.actor_name || (a.actor_id ? `${a.actor_type} #${a.actor_id}` : a.actor_type),
  detail: [a.subject_type ? `${String(a.subject_type).split('\\').pop()} #${a.subject_id ?? ''}` : '', auditDetail(a.meta)].filter(Boolean).join(' · '),
})
/* Website content row (news / sponsor_tier / faq). News rows also get the
   article shape the public pages use. */
const normContent = (c) => ({
  ...c,
  meta: c.meta || {},
  img: c.image_url || '',
  excerpt: c.subtitle || '',
  date: (c.meta && c.meta.date) || '',
  tag: (c.meta && c.meta.tag) || '',
  read: (c.meta && c.meta.read) || '',
  alt: (c.meta && c.meta.alt) || c.title,
})
const demoOnly = () => { throw new ApiError(0, 'Not available in the demo preview') }
const adminTok = () => ({ token: tokens.getAdmin() })
const normNominee = (n) => {
  if (!n || n.categoryId !== undefined) return n
  return {
    ...n,
    categoryId: n.category_id ?? n.category?.id ?? null,
    votes: n.votes_count ?? 0,
    photo: n.photo_url || n.photo || '',
    legalName: n.legalName || n.name,
    approved: n.status === 'approved',
    reviewNotes: n.review_notes || n.reviewNotes || '',
    category: n.category ? normCategory(n.category) : n.category,
  }
}
const normNominees = (arr) => (arr || []).map(normNominee)
const normCategories = (arr) => (arr || []).map(normCategory)
/* Extract the linked nominee profile from a /auth/* user payload. */
const nomineeOfUser = (u) => (u && u.nominee ? normNominee(u.nominee) : null)

/* Settings shape adapter: the API speaks snake_case keys; the pages use
   the demo shape (votingStart, resultsPublished, ceremonyVenue, ...). */
const normSettings = (s) => {
  if (!s || s.votingStart !== undefined) return s
  return {
    ...s,
    votingStart: s.voting_start || '',
    votingEnd: s.voting_end || '',
    votingOpen: !!s.voting_open,
    resultsPublished: !!s.results_published,
    ceremonyDate: s.ceremony_date || '',
    ceremonyTime: s.ceremony_time || '',
    googleEnabled: !!s.google_enabled,
    googleClientId: s.google_client_id || '',
    ceremonyCity: s.ceremony_city || '',
    ceremonySession: s.ceremony_session || '',
    ceremonyVenue: s.ceremony_venue || '',
    awardsPerCategory: Number(s.awards_per_category || 5),
    edition: s.edition || '2026',
    termsVersion: s.terms_version || '1.0',
  }
}
/* Outbound key map for the admin settings form. */
const denormSettings = (patch) => {
  const map = { votingStart: 'voting_start', votingEnd: 'voting_end', ceremonyVenue: 'ceremony_venue', ceremonyDate: 'ceremony_date', ceremonyTime: 'ceremony_time', ceremonyCity: 'ceremony_city', ceremonySession: 'ceremony_session', termsVersion: 'terms_version', edition: 'edition', awardsPerCategory: 'awards_per_category' }
  const out = {}
  for (const [k, v] of Object.entries(patch || {})) out[map[k] || k] = v
  return out
}
/* Published snapshot adapter: API payload nests categories as a list;
   the pages index them by category id and read at/version on top. */
const normSnapshot = (d) => {
  if (!d || !d.snapshot) return null
  const cats = {}
  for (const c of (d.snapshot.categories || [])) {
    cats[c.category_id] = (c.top || []).map((t) => ({
      nomineeId: t.nominee_id, rank: t.rank, name: t.nominee_name, title: t.title,
      votes: t.votes_count, handle: t.handle, platform: t.platform, photo: t.photo_url || '',
    }))
  }
  return { ...d.snapshot, categories: cats, at: d.published_at, version: d.version }
}

/* Chart shape adapters: the API returns {date|hour, count} rows; the
   charts consume the demo shapes ({label, count} objects or plain
   count arrays). */
const dayLabel = (dateStr) => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch { return dateStr }
}
const weekdayLabel = (dateStr) => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short' })
  } catch { return dateStr }
}
const normVoterStats = (s) => {
  if (!s || s.total !== undefined) return s
  return {
    total: s.voters ?? 0,
    counted: s.votes_counted ?? 0,
    avg: s.avg_votes_per_voter ?? 0,
    multi: s.multi_category_voters ?? 0,
    today: s.new_voters_today ?? 0,
  }
}

let settingsCache = null

/* Registration form (page shape) -> API nominee profile fields. */
const registrationBody = (d) => ({
  name: d.legalName || null,
  display_name: d.displayName,
  mobile: d.mobile || null,
  country: d.country || null,
  city: d.city || null,
  category_id: Number(d.categoryId),
  platform: d.platform || null,
  handle: d.handle || null,
  profile_url: d.profileUrl || null,
  followers: d.followers || null,
  bio: d.bio || null,
})

export const Store = {
  mode: getMode,

  /* ---------- reference data ---------- */
  categories: () => call(() => Demo.CATEGORIES, () => api.get('/categories').then((r) => normCategories(listOf(r)))),
  /* Public settings are read by most pages; one shared request per 30s. */
  settings: () => call(() => Demo.settings(), () => {
    if (!settingsCache || Date.now() - settingsCache.at > 30000) {
      const p = api.get('/settings').then((r) => normSettings(oneOf(r)))
      settingsCache = { at: Date.now(), p }
      p.catch(() => { settingsCache = null })
    }
    return settingsCache.p
  }),
  saveSettings: (patch) =>
    call(() => Demo.saveSettings(patch),
      () => api.patch('/admin/settings', { settings: denormSettings(patch) }, { token: tokens.getAdmin() }).then((r) => {
        settingsCache = null
        return normSettings(oneOf(r))
      })),
  /* 'upcoming' | 'open' | 'closed'. The API says live/ended; the pages use open/closed. */
  votingState: () => call(() => Demo.votingState(), () => api.get('/voting/state').then((r) => {
    const s = oneOf(r).state
    return s === 'live' ? 'open' : s === 'ended' ? 'closed' : s
  })),
  /* kind 'voting': next voting milestone (opens / closes).
     kind 'ceremony': the awards ceremony (Dubai time). */
  countdownTarget: (kind = 'voting') => call(() => {
    if (kind !== 'ceremony') return Demo.countdownTarget()
    return Demo.settings().ceremony
  }, async () => {
    const s = await Store.settings()
    if (kind === 'ceremony') {
      if (!s.ceremonyDate) return null
      return `${s.ceremonyDate}T${/^\d{2}:\d{2}$/.test(s.ceremonyTime) ? s.ceremonyTime : '00:00'}:00+04:00`
    }
    const v = await api.get('/voting/state').then((r) => oneOf(r).state)
    /* The window covers whole Dubai days: start-of-day open, end-of-day close. */
    if (v === 'upcoming') return s.votingStart ? `${s.votingStart}T00:00:00+04:00` : null
    return s.votingEnd ? `${s.votingEnd}T23:59:59+04:00` : null
  }),
  category: (id) => call(() => Demo.category(id),
    () => api.get('/categories').then((r) => normCategory(normCategories(listOf(r)).find((c) => String(c.id) === String(id)) || null))),

  /* ---------- nominees ---------- */
  allNominees: () => call(() => Demo.all(),
    () => api.get('/admin/nominees?per_page=500', adminTok()).then((r) => normNominees(listOf(r)))),
  getNominee: (id) => call(() => Demo.get(id), () => api.get(`/nominees/${id}`).then((r) => normNominee(oneOf(r)))),
  approved: () => call(() => Demo.approved(), () => api.get('/nominees?status=approved').then((r) => normNominees(listOf(r)))),
  byCategory: (catId, onlyApproved = true) =>
    call(() => Demo.byCategory(catId, onlyApproved),
      () => api.get(`/nominees?category=${catId}${onlyApproved ? '&status=approved' : ''}`).then((r) => normNominees(listOf(r)))),
  top5: (catId) => call(() => Demo.top5(catId), () => api.get(`/categories/${catId}/top5`).then((r) => normNominees(listOf(r)))),
  approvedCount: (catId) =>
    call(() => Demo.approvedCount(catId),
      () => api.get(`/categories/${catId}/stats`).then((r) => oneOf(r).approved_count || 0)),
  stats: (catId) => call(() => Demo.stats(catId), () => api.get(`/categories/${catId}/stats`).then(oneOf)),
  pct: (inf) => call(() => Demo.pct(inf), async () => {
    const s = await Store.stats(inf.categoryId)
    const total = s.total || 0
    return total > 0 ? (inf.votes / total) * 100 : 0
  }),
  rank: (inf) => call(() => Demo.rank(inf), async () => {
    const list = await Store.byCategory(inf.categoryId, true)
    const i = list.findIndex((x) => x.id === inf.id)
    return i >= 0 ? i + 1 : -1
  }),

  nominate: (d) => call(() => Demo.nominate(d), async () => {
    const r = oneOf(await api.post('/auth/register', { ...registrationBody(d), email: d.email, password: d.password }))
    if (r && r.token) tokens.set(r.token)
    return nomineeOfUser(r && r.user)
  }),
  setNominationStatus: (id, status, notes) =>
    call(() => Demo.setNominationStatus(id, status, notes),
      () => api.patch(`/admin/nominees/${id}`, { status: status === 'submitted' ? 'pending' : status }, adminTok()).then((r) => normNominee(oneOf(r)))),
  removeNomination: (id) =>
    call(() => { Demo.setNominationStatus(id, 'rejected', 'Removed by admin'); return true },
      () => api.del(`/admin/nominees/${id}`, adminTok()).then(() => true)),

  /* ---------- influencer auth ---------- */
  login: (email, password) =>
    call(() => Demo.login(email, password), async () => {
      const d = oneOf(await api.post('/auth/login', { email, password }))
      if (d && d.token) tokens.set(d.token)
      return nomineeOfUser(d && d.user)
    }),
  session: () => call(() => Demo.session(), async () => {
    const t = tokens.get()
    if (!t) return null
    try { return nomineeOfUser(oneOf(await api.get('/auth/me', { token: t }))) } catch { tokens.set(null); return null }
  }),
  clearSession: () => call(() => { Demo.clearSession(); tokens.set(null) },
    async () => { try { await api.post('/auth/logout', {}, { token: tokens.get() }) } catch {} tokens.set(null) }),

  voteLink: (id) => Demo.voteLink(id),

  /* ---------- voting ---------- */
  voterChoice: (catId) => call(() => Demo.voterChoice(catId), () => api.get(`/votes/my-choice?category=${catId}`, { token: tokens.get() }).then((r) => oneOf(r).nominee_id || null)),

  /* Production flow: vote is created HELD, an email OTP is sent, and the
     vote only counts after the code is verified. Unverified votes never
     count. Demo mode counts immediately (no mailer in a static build).
     The backend speaks {data:{id,status}} + {code} errors; this layer
     translates to the {ok, otp_required, hold_id, code} shape the pages
     use, so pages never depend on transport details. */
  registerAndVote: (nomineeId, info) =>
    call(() => Demo.registerAndVote(nomineeId, info), async () => {
      try {
        const r = oneOf(await api.post('/votes', { nominee_id: nomineeId, ...info }))
        return { ok: true, otp_required: r.status === 'held', hold_id: r.id }
      } catch (e) {
        if (e instanceof ApiError) return { ok: false, code: (e.payload && e.payload.code) || 'VOTE_FAILED' }
        throw e
      }
    }),
  verifyVoteOtp: (holdId, code) =>
    call(() => ({ ok: true }), async () => {
      try {
        await api.post('/votes/verify', { vote_id: holdId, code })
        return { ok: true }
      } catch (e) {
        if (e instanceof ApiError) return { ok: false, code: (e.payload && e.payload.code) || 'OTP_INVALID' }
        throw e
      }
    }),
  resendVoteOtp: (holdId) =>
    call(() => ({ ok: true }), () => api.post('/votes/resend-otp', { vote_id: holdId }).then(() => ({ ok: true }))),

  recentVotes: (limit = 50) =>
    call(() => Demo.recentVotes(limit),
      () => api.get(`/admin/votes?per_page=${Math.min(500, limit)}`, adminTok()).then((r) => listOf(r).map(normVote))),
  invalidateVote: (voteId, reason) =>
    call(() => Demo.invalidateVote(voteId, reason),
      () => api.post(`/admin/votes/${voteId}/invalidate`, { reason }, { token: tokens.getAdmin() }).then(() => true)),

  /* ---------- analytics ---------- */
  votesFor: (nomineeId) =>
    call(() => Demo.votesFor(nomineeId),
      () => api.get(`/nominees/${nomineeId}/votes`).then(listOf)),
  votesInLast: (nomineeId, ms) =>
    call(() => Demo.votesInLast(nomineeId, ms),
      () => api.get(`/nominees/${nomineeId}/analytics?window_ms=${ms}`).then((r) => oneOf(r).count || 0)),
  votesPerDay: (nomineeId, days = 14) =>
    call(() => Demo.votesPerDay(nomineeId, days),
      () => api.get(`/analytics/votes-per-day?days=${days}${nomineeId ? `&nominee_id=${nomineeId}` : ''}`)
        .then((r) => listOf(r).map((x) => ({ label: dayLabel(x.date), count: x.count })))),
  votesPerHour: (hours = 24) =>
    call(() => Demo.votesPerHour(hours),
      () => api.get(`/admin/analytics/votes-per-hour?hours=${hours}`, { token: tokens.getAdmin() })
        .then((r) => listOf(r).map((x) => x.count))),
  newVotersPerDay: (days = 7) =>
    call(() => Demo.newVotersPerDay(days),
      () => api.get(`/admin/analytics/new-voters-per-day?days=${days}`, { token: tokens.getAdmin() })
        .then((r) => listOf(r).map((x) => ({ label: weekdayLabel(x.date), count: x.count })))),
  voterStats: () =>
    call(() => Demo.voterStats(),
      () => api.get('/admin/voters/stats', { token: tokens.getAdmin() }).then((r) => normVoterStats(oneOf(r)))),
  blockedAttempts: () =>
    call(() => Demo.blockedAttempts(),
      () => api.get('/admin/analytics/blocked-attempts', { token: tokens.getAdmin() }).then((r) => oneOf(r).count || 0)),
  votesByCategory: () =>
    call(() => Demo.votesByCategory(),
      () => api.get('/analytics/votes-by-category').then(oneOf)),

  /* ---------- results ---------- */
  /* selections: { [categoryId]: [nomineeId, ...] } — admin-confirmed winners in rank order. */
  publishResults: (selections) =>
    call(() => Demo.publishResults(),
      () => api.post('/admin/results/publish', selections ? { selections } : {}, adminTok()).then(oneOf)),
  standings: () => call(demoOnly, () => api.get('/admin/results/standings', adminTok()).then(oneOf)),
  leaderboard: () => call(demoOnly, () => api.get('/leaderboard').then(oneOf)),
  unpublishResults: () =>
    call(() => { Demo.unpublishResults(); return true },
      () => api.del('/admin/results', { token: tokens.getAdmin() }).then(() => true)),
  resultSnapshot: () =>
    call(() => { const s = Demo.settings(); return s.resultsPublished ? s.snapshot : null },
      () => api.get('/results').then((r) => normSnapshot(oneOf(r))).catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      })),

  /* ---------- event + comms ---------- */
  addRsvp: (d) => call(() => { Demo.addRsvp(d); return true }, () =>
    api.post('/rsvps', {
      name: d.name,
      email: d.email,
      mobile: d.mobile || null,
      guest_type: d.type || 'guest',
      guests_count: Number(d.guests) || 1,
    }).then(() => true)),
  rsvps: () => call(() => { try { return JSON.parse(localStorage.getItem('pfa_db_v2')).rsvps || [] } catch { return [] } },
    () => api.get('/admin/rsvps?per_page=500', adminTok()).then((r) => listOf(r).map(normRsvp))),
  toggleCheckIn: (id, checkedIn = false) =>
    call(() => { Demo.toggleCheckIn(id); return true },
      () => (checkedIn
        ? api.del(`/admin/rsvps/${id}/checkin`, adminTok())
        : api.post(`/admin/rsvps/${id}/checkin`, {}, adminTok())).then(() => true)),
  addEnquiry: (d) => call(() => { Demo.addEnquiry(d); return true }, () => api.post('/enquiries', d).then(() => true)),
  enquiries: () => call(() => { try { return JSON.parse(localStorage.getItem('pfa_db_v2')).enquiries || [] } catch { return [] } },
    () => api.get('/admin/enquiries?per_page=500', adminTok()).then((r) => listOf(r).map(normEnquiry))),
  markEnquiryRead: (id) =>
    call(() => { Demo.markEnquiryRead(id); return true },
      () => api.patch(`/admin/enquiries/${id}`, { read: true }, { token: tokens.getAdmin() }).then(() => true)),
  auditLog: (limit = 100) =>
    call(() => Demo.auditLog(limit),
      () => api.get(`/admin/audit?per_page=${Math.min(500, limit)}`, adminTok()).then((r) => listOf(r).map(normAudit))),
  exportCsv: async (kind) => {
    if (mode === 'api') {
      const r = await fetch(`${API_BASE}/admin/export/${kind}`, {
        headers: { Authorization: `Bearer ${tokens.getAdmin()}` },
      })
      return await r.blob()
    }
    return null // demo mode: callers build CSV client-side
  },

  /* ---------- admin auth ---------- */
  adminLogin: (u, p) =>
    call(() => Demo.adminLogin(u, p), async () => {
      const r = oneOf(await api.post('/admin/login', { username: u, password: p }))
      if (r && r.token) { tokens.setAdmin(r.token); return true }
      return false
    }),
  isAdmin: () => call(() => Demo.isAdmin(), () => Promise.resolve(!!tokens.getAdmin())),
  adminLogout: () =>
    call(() => { Demo.adminLogout(); return true },
      async () => { try { await api.post('/admin/logout', {}, { token: tokens.getAdmin() }) } catch {} tokens.setAdmin(null); return true }),

  resetDemo: () => { if (DEMO_ENABLED && mode === 'demo') Demo.resetDemo(); return Promise.resolve(true) },

  /* ---------- website content (public) ---------- */
  content: (type) => call(() => demoContent(type).map(normContent),
    () => api.get(`/content/${type}`).then((r) => listOf(r).map(normContent))),
  article: (slug) => call(() => { const a = demoContent('news').find((x) => x.slug === slug); return a ? normContent(a) : null },
    () => api.get(`/content/news/${encodeURIComponent(slug)}`).then((r) => normContent(oneOf(r))).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    })),

  /* ---------- account: Google sign-in + password reset ---------- */
  /* mode 'login' → { ok, nominee } or { ok:false, code:'GOOGLE_NO_ACCOUNT', name, email }.
     mode 'register' also needs the registration profile fields. */
  googleAuth: (credential, mode = 'login', profile = {}) => call(demoOnly, async () => {
    try {
      const r = oneOf(await api.post('/auth/google', {
        credential, mode,
        ...(mode === 'register' ? registrationBody(profile) : {}),
      }))
      if (r && r.token) tokens.set(r.token)
      return { ok: true, nominee: nomineeOfUser(r && r.user) }
    } catch (e) {
      if (e instanceof ApiError && e.payload) {
        return { ok: false, code: e.payload.code || 'GOOGLE_FAILED', message: e.payload.message, ...(e.payload.data || {}) }
      }
      throw e
    }
  }),
  forgotPassword: (email) => call(demoOnly, () => api.post('/auth/forgot-password', { email }).then((r) => r.message)),
  resetPassword: (d) => call(demoOnly, () => api.post('/auth/reset-password', d).then((r) => r.message)),
  updateMyProfile: (data) => call(demoOnly,
    () => api.patch('/influencer/profile', data, { token: tokens.get() }).then((r) => normNominee(oneOf(r)))),

  /* ---------- admin: email delivery, templates, campaigns ---------- */
  mailSettings: () => call(demoOnly, () => api.get('/admin/mail-settings', adminTok()).then(oneOf)),
  saveMailSettings: (d) => call(demoOnly, () => api.put('/admin/mail-settings', d, adminTok()).then(oneOf)),
  testMail: (to) => call(demoOnly, () => api.post('/admin/mail-settings/test', { to }, { ...adminTok(), timeout: 30000 }).then((r) => r.message)),
  emailTemplates: () => call(demoOnly, () => api.get('/admin/email-templates', adminTok())),
  saveEmailTemplate: (id, d) => call(demoOnly,
    () => (id ? api.patch(`/admin/email-templates/${id}`, d, adminTok()) : api.post('/admin/email-templates', d, adminTok())).then(oneOf)),
  deleteEmailTemplate: (id) => call(demoOnly, () => api.del(`/admin/email-templates/${id}`, adminTok()).then(() => true)),
  previewEmailTemplate: (d) => call(demoOnly, () => api.post('/admin/email-templates/preview', d, adminTok()).then(oneOf)),
  testEmailTemplate: (id, to) => call(demoOnly, () => api.post(`/admin/email-templates/${id}/test`, { to }, { ...adminTok(), timeout: 30000 }).then((r) => r.message)),
  campaigns: () => call(demoOnly, () => api.get('/admin/campaigns', adminTok())),
  campaign: (id, params = '') => call(demoOnly, () => api.get(`/admin/campaigns/${id}${params}`, adminTok())),
  saveCampaign: (id, d) => call(demoOnly,
    () => (id ? api.patch(`/admin/campaigns/${id}`, d, adminTok()) : api.post('/admin/campaigns', d, adminTok())).then(oneOf)),
  deleteCampaign: (id) => call(demoOnly, () => api.del(`/admin/campaigns/${id}`, adminTok()).then(() => true)),
  duplicateCampaign: (id) => call(demoOnly, () => api.post(`/admin/campaigns/${id}/duplicate`, {}, adminTok()).then(oneOf)),
  audienceCount: (d) => call(demoOnly, () => api.post('/admin/campaigns/audience-count', d, adminTok()).then(oneOf)),
  /* Both return { data: campaign, processed, pending }. */
  sendCampaign: (id) => call(demoOnly, () => api.post(`/admin/campaigns/${id}/send`, {}, { ...adminTok(), timeout: 120000 })),
  processCampaign: (id) => call(demoOnly, () => api.post(`/admin/campaigns/${id}/process`, {}, { ...adminTok(), timeout: 120000 })),

  /* ---------- admin: full CRUD over site data ---------- */
  reviewNominee: (id, body) => call(demoOnly,
    () => api.post(`/admin/nominees/${id}/review`, body, adminTok()).then((r) => normNominee(oneOf(r)))),
  /* Raw stored settings (incl. disabled Google client id) for the admin form. */
  adminSettings: () => call(() => ({}), () => api.get('/admin/settings', adminTok()).then(oneOf)),
  saveRawSettings: (settings) => call(demoOnly, () => api.patch('/admin/settings', { settings }, adminTok()).then((r) => {
    settingsCache = null
    return oneOf(r)
  })),
  adminMe: () => call(() => ({ name: 'Demo Admin', email: 'demo', role: 'super_admin' }),
    () => api.get('/auth/me', adminTok()).then(oneOf)),

  adminContent: (type) => call(() => demoContent(type).map(normContent),
    () => api.get(`/admin/content?type=${type}`, adminTok()).then((r) => listOf(r).map(normContent))),
  saveContent: (id, data) => call(demoOnly,
    () => (id ? api.patch(`/admin/content/${id}`, data, adminTok()) : api.post('/admin/content', data, adminTok())).then((r) => normContent(oneOf(r)))),
  deleteContent: (id) => call(demoOnly, () => api.del(`/admin/content/${id}`, adminTok()).then(() => true)),

  adminCategories: () => call(() => Demo.CATEGORIES,
    () => api.get('/admin/categories', adminTok()).then((r) => normCategories(listOf(r)))),
  saveCategory: (id, data) => call(demoOnly,
    () => (id ? api.patch(`/admin/categories/${id}`, data, adminTok()) : api.post('/admin/categories', data, adminTok())).then((r) => normCategory(oneOf(r)))),
  deleteCategory: (id) => call(demoOnly, () => api.del(`/admin/categories/${id}`, adminTok()).then(() => true)),

  saveNominee: (id, data) => call(demoOnly,
    () => (id ? api.patch(`/admin/nominees/${id}`, data, adminTok()) : api.post('/admin/nominees', data, adminTok())).then((r) => normNominee(oneOf(r)))),

  users: () => call(() => [], () => api.get('/admin/users', adminTok()).then(listOf)),
  saveUser: (id, data) => call(demoOnly,
    () => (id ? api.patch(`/admin/users/${id}`, data, adminTok()) : api.post('/admin/users', data, adminTok())).then(oneOf)),
  deleteUser: (id) => call(demoOnly, () => api.del(`/admin/users/${id}`, adminTok()).then(() => true)),

  deleteRsvp: (id) => call(demoOnly, () => api.del(`/admin/rsvps/${id}`, adminTok()).then(() => true)),
  deleteEnquiry: (id) => call(demoOnly, () => api.del(`/admin/enquiries/${id}`, adminTok()).then(() => true)),

  /* ---------- formatting helpers ---------- */
  fmt, initials, fmtTime,
}

export { fmt, initials, fmtTime }
