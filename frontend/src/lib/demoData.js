/* ProFluencer Awards — DEMO data store (ES module port of the reference
   static build's data.js).
   ---------------------------------------------------------------------------
   DEMO DATA — clearly labelled. This store backs the static/GitHub Pages
   preview with seeded sample nominees and browser-local votes. It is NOT
   real data: nominees, votes, winners and metrics shown from this store are
   samples for design/preview purposes only.
   Production uses the Laravel API via src/lib/store.js; page code keeps
   calling the same Store.* functions either way.
   ------------------------------------------------------------------------- */

const DB_KEY = 'pfa_db_v2'
const SESSION_KEY = 'pfa_session_v2'
const ADMIN_KEY = 'pfa_admin_v2'
const VOTER_KEY = 'pfa_voter_v2'

export const DEMO_LABEL = 'Demo data'

export const CATEGORIES = [
  { id: 'fashion', name: 'Fashion and Beauty', tagline: 'Style icons setting the trends', desc: 'Fashion, styling, cosmetics and skincare creators whose looks move culture.', img: 'img/cat-fashion.jpg' },
  { id: 'lifestyle', name: 'Lifestyle and Entertainment', tagline: 'The ones who keep us watching', desc: 'Lifestyle, comedy, music, gaming and general entertainment creators.', img: 'img/cat-entertainment.jpg' },
  { id: 'travel', name: 'Travel and Hospitality', tagline: 'Storytellers of extraordinary places', desc: 'Destinations, hotels, tourism and travel experiences, beautifully documented.', img: 'img/cat-travel.jpg' },
  { id: 'food', name: 'Food and Dining', tagline: 'Taste-makers of the region', desc: 'Restaurants, recipes, chefs and honest food reviews.', img: 'img/cat-food.jpg' },
  { id: 'fitness', name: 'Health, Fitness and Wellness', tagline: 'Coaches building stronger lives', desc: 'Fitness, sport, wellbeing and healthy living, backed by real results.', img: 'img/cat-fitness.jpg' },
  { id: 'business', name: 'Business and Entrepreneurship', tagline: 'Builders of what is next', desc: 'Entrepreneurship, leadership, marketing and career growth voices.', img: 'img/cat-business.jpg' },
  { id: 'finance', name: 'Finance, Trading and Crypto', tagline: 'Minds moving money smartly', desc: 'Personal finance, investing, forex, trading and crypto education.', img: 'img/cat-finance.jpg' },
  { id: 'tech', name: 'Technology and Innovation', tagline: 'Voices decoding tomorrow', desc: 'Gadgets, software, AI and technology education for everyone.', img: 'img/cat-tech.jpg' },
  { id: 'realestate', name: 'Real Estate and Home', tagline: 'Curators of exceptional spaces', desc: 'Property, interiors, architecture and home improvement experts.', img: 'img/cat-realestate.jpg' },
  { id: 'education', name: 'Education, Parenting and Family', tagline: 'Teachers of the internet age', desc: 'Learning, parenting, family and children\u2019s education creators.', img: 'img/cat-education.jpg' },
]

function defaultSettings() {
  return {
    edition: 'ProFluencer Awards 2026',
    votingStart: '2026-10-15T00:00:00+04:00',
    votingEnd: '2026-11-30T23:59:59+04:00',
    ceremony: '2026-12-11T15:00:00+04:00',
    ceremonyVenue: 'Dubai, UAE — venue announced soon',
    resultsPublished: false,
    snapshot: null,
    snapshotVersion: 0,
    snapshotHistory: [],
    termsVersion: 'v1.0 — Sep 2026',
  }
}

/* DEMO seed nominees — sample profiles for preview only, not real people.
   [catId, displayName, handle, platform, votes, followers, bio, country, city] */
const SEED = [
  ['fashion','Amira Khan','@amirakhan.style','Instagram',3421,'1.2M','Modest fashion stylist turning everyday looks into statements.','UAE','Dubai'],
  ['fashion','Layla Haddad','@layla.haddad','TikTok',2874,'980K','Beauty creator famous for 60-second glow-up transformations.','UAE','Abu Dhabi'],
  ['fashion','Sofia Reyes','@sofiareyes.glam','YouTube',1932,'760K','Luxury unboxings and honest designer reviews, weekly.','Spain','Dubai'],
  ['fashion','Omar Farouk','@omarfarouk.men','Instagram',1204,'540K','Menswear minimalism with a Middle Eastern twist.','Egypt','Dubai'],
  ['fashion','Priya Nair','@priyanair.beauty','TikTok',866,'410K','Skincare science made simple for busy routines.','India','Sharjah'],
  ['lifestyle','Faisal Ahmed','@funnyfaisal','TikTok',3567,'1.6M','Sketch comedy on expat life in the Gulf.','Pakistan','Dubai'],
  ['lifestyle','Lina Omar','@lololaughs','Instagram',2901,'1.1M','Relatable reels on family, food and beautiful chaos.','UAE','Dubai'],
  ['lifestyle','Ryan DSouza','@thedubaidude','YouTube',2134,'800K','Pranks, challenges and feel-good vlogs.','India','Dubai'],
  ['lifestyle','Mariam Nasser','@mariam.skits','TikTok',1567,'620K','Character comedy with a brand-new persona every week.','UAE','Ajman'],
  ['lifestyle','Kabir Shah','@kabircomedy','Instagram',1023,'430K','Stand-up clips and crowd-work gold.','India','Dubai'],
  ['travel','Aisha Belhoul','@aishabelhoul.travels','Instagram',3254,'1.3M','Luxury escapes and cultural deep-dives, beautifully shot.','UAE','Dubai'],
  ['travel','Sam Whitfield','@wanderwithsam','YouTube',2765,'950K','Budget-to-luxury travel guides in cinematic 4K.','UK','Dubai'],
  ['travel','Noor Al Suwaidi','@nooralsuwaidi.luxe','TikTok',1988,'720K','48-hour city guides for the time-poor explorer.','UAE','Abu Dhabi'],
  ['travel','Elena Petrova','@elenapetrova.goes','Instagram',1423,'560K','Solo travel storytelling with safety-first honesty.','Russia','Dubai'],
  ['travel','Arjun Mehta','@arjunmehta.roams','YouTube',967,'390K','Road trips and mountain trails across Asia.','India','Dubai'],
  ['food','Ravi Kumar','@chefravi.kumar','Instagram',2988,'1.0M','Fine-dining chef revealing restaurant secrets at home.','India','Dubai'],
  ['food','Fatima Al Farsi','@fatimaalfarsi.eats','TikTok',2412,'840K','Hidden-gem hunter across the Emirates food scene.','UAE','Sharjah'],
  ['food','Marco Silva','@marcosilva.food','YouTube',1765,'690K','From street carts to Michelin stars, reviewed honestly.','Italy','Dubai'],
  ['food','Huda Karim','@hudakarim.kitchen','Instagram',1290,'480K','15-minute family recipes with Levantine soul.','Lebanon','Dubai'],
  ['food','Daniel Osei','@danielosei.tastes','TikTok',874,'350K','Dessert obsessive rating every viral sweet.','Ghana','Dubai'],
  ['fitness','Khalid Mansour','@khalidmansour.fit','Instagram',3102,'1.1M','Strength coach behind 90-day transformations that last.','UAE','Dubai'],
  ['fitness','Zara Ahmed','@zaraahmed.fit','TikTok',2654,'890K','Home workouts, zero excuses, real results.','Pakistan','Dubai'],
  ['fitness','Jake Morrison','@jakemorrison.train','YouTube',1876,'720K','Evidence-based training, no bro-science.','UK','Dubai'],
  ['fitness','Divya Menon','@divyamenon.yoga','Instagram',1345,'510K','Yoga flows for desk workers and new mothers.','India','Dubai'],
  ['fitness','Tariq Aziz','@tariqaziz.gym','TikTok',923,'380K','Street-workout athlete documenting the grind daily.','Pakistan','Sharjah'],
  ['business','Omar Khalidi','@omarkhalidi.startups','Instagram',2876,'1.0M','Startup mentor turning ideas into funded companies.','UAE','Dubai'],
  ['business','Sara Nasser','@saranasser.ceo','TikTok',2432,'870K','E-commerce founder sharing unfiltered business lessons.','UAE','Dubai'],
  ['business','Nadia Rahman','@nadiarahman.marketing','Instagram',1898,'700K','Marketing strategist for ambitious small brands.','UK','Dubai'],
  ['business','Vikram Rao','@vikramrao.ventures','YouTube',1354,'520K','Venture building and fundraising, explained clearly.','India','Dubai'],
  ['business','Tariq Mahmood','@tariqmahmood.scale','TikTok',912,'360K','Operations and scaling advice for growing teams.','Pakistan','Abu Dhabi'],
  ['finance','Faisal Merchant','@faisalmerchant.fx','Instagram',3120,'1.2M','Markets explained in plain language, every day.','UAE','Dubai'],
  ['finance','Anita Desai','@anitadesai.money','YouTube',2567,'900K','Personal finance for first-generation earners.','India','Dubai'],
  ['finance','Rania Khalil','@raniakhalil.biz','TikTok',1890,'710K','Startup stories and SME money lessons.','UAE','Dubai'],
  ['finance','James Carter','@jamescarter.trades','YouTube',1342,'520K','Risk-first trading education for beginners.','UK','Dubai'],
  ['finance','Lina Haddad','@linacrypto.dxb','Instagram',1045,'410K','Crypto concepts without the hype or jargon.','Lebanon','Dubai'],
  ['tech','Bilal Sheikh','@techwithbilal','YouTube',2890,'1.1M','Gadget reviews with zero sponsorship bias.','Pakistan','Dubai'],
  ['tech','Sara Iqbal','@saraiqbal.tech','Instagram',2345,'820K','Making AI and apps understandable for everyone.','UAE','Dubai'],
  ['tech','David Chen','@davidchen.gadgets','TikTok',1834,'700K','60-second tech tips you will actually use.','China','Dubai'],
  ['tech','Layla Rahman','@laylarahman.reviews','YouTube',1276,'490K','Deep-dive comparisons before you spend a dirham.','UAE','Sharjah'],
  ['tech','Omar Haddad','@omarhaddad.unbox','Instagram',845,'340K','Satisfying unboxings and dream setup tours.','UAE','Dubai'],
  ['realestate','Khalid Rahman','@khalidrahman.property','Instagram',2765,'990K','Dubai property tours, from studios to penthouses.','UAE','Dubai'],
  ['realestate','Mira Al Farsi','@miraalfarsi.interiors','TikTok',2312,'840K','Interior transformations on real budgets.','UAE','Abu Dhabi'],
  ['realestate','Adel Karim','@adelkarim.realty','YouTube',1876,'700K','Honest market analysis for buyers and investors.','Egypt','Dubai'],
  ['realestate','Sofia Nasser','@sofianasser.homes','Instagram',1298,'500K','Home styling that feels like a boutique hotel.','Lebanon','Dubai'],
  ['realestate','Omar Farid','@omarfarid.estates','TikTok',934,'370K','Off-plan explained simply, no sales talk.','UAE','Dubai'],
  ['education','Sana Sheikh','@drsanasheikh','Instagram',2765,'1.0M','Doctor breaking down health myths for families.','Pakistan','Dubai'],
  ['education','Karim Yusuf','@coachkarim','YouTube',2312,'860K','Career skills and interview mastery for youth.','UAE','Dubai'],
  ['education','Laila Hassan','@learnwithlaila','TikTok',1789,'680K','English made easy, one minute at a time.','Egypt','Sharjah'],
  ['education','Ahmed Raza','@profahmedraza','Instagram',1287,'500K','History threads that read like thrillers.','India','Dubai'],
  ['education','Mira Adel','@mindsetmira','YouTube',934,'360K','Psychology-backed productivity for students.','UAE','Dubai'],
]

const now = () => Date.now()

function seedInfluencers() {
  const t = now()
  return SEED.map((s, i) => ({
    id: 'seed-' + i,
    categoryId: s[0], name: s[1], legalName: s[1], handle: s[2], platform: s[3],
    profileUrl: '', votes: s[4], followers: s[5], bio: s[6], country: s[7], city: s[8],
    email: '', mobile: '', photo: '',
    status: 'approved', approved: true, reviewNotes: '',
    marketingConsent: false, termsVersion: defaultSettings().termsVersion,
    createdAt: t - (60 - i) * 3600000,
    approvedAt: t - (59 - i) * 3600000,
    lastVoteAt: t - (50 - i) * 60000,
    updatedAt: t,
  }))
}

function seed() {
  return { influencers: seedInfluencers(), voters: [], votes: [], audit: [], rsvps: [], enquiries: [], settings: defaultSettings() }
}

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) { const db = JSON.parse(raw); if (db && db.influencers && db.settings) return db }
  } catch {}
  const db = seed(); save(db); return db
}
function save(db) { try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch {} }

function uid(p) { return (p || 'id') + '-' + now().toString(36) + Math.random().toString(36).slice(2, 8) }
export function initials(name) {
  return String(name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
export function fmt(n) {
  n = Math.round(n)
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K'
  return String(n)
}
function hashStr(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(16)
}
function pad(n) { return (n < 10 ? '0' : '') + n }
export function fmtTime(ts) {
  const d = new Date(ts)
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

function rankSort(a, b) {
  if (b.votes !== a.votes) return b.votes - a.votes
  if (a.lastVoteAt !== b.lastVoteAt) return a.lastVoteAt - b.lastVoteAt
  if (a.approvedAt !== b.approvedAt) return a.approvedAt - b.approvedAt
  return a.id < b.id ? -1 : 1
}

export const Demo = {
  CATEGORIES,

  settings: () => load().settings,
  saveSettings(patch) {
    const db = load()
    Object.assign(db.settings, patch)
    save(db); return db.settings
  },

  votingState() {
    const s = Demo.settings(), t = now()
    if (t < new Date(s.votingStart).getTime()) return 'upcoming'
    if (t > new Date(s.votingEnd).getTime()) return 'closed'
    return 'open'
  },
  countdownTarget: () => Demo.settings().votingEnd,

  category: (id) => CATEGORIES.find(c => c.id === id) || null,

  all: () => load().influencers.slice().sort(rankSort),
  get: (id) => load().influencers.find(x => x.id === id) || null,
  approved: () => load().influencers.filter(x => x.status === 'approved').sort(rankSort),
  byCategory: (catId, onlyApproved) =>
    load().influencers.filter(x => x.categoryId === catId && (!onlyApproved || x.status === 'approved')).sort(rankSort),
  top5: (catId) => Demo.byCategory(catId, true).slice(0, 5),
  approvedCount: (catId) => Demo.byCategory(catId, true).length,

  stats(catId) {
    const list = Demo.byCategory(catId, true)
    return { count: list.length, total: list.reduce((s, x) => s + x.votes, 0) }
  },
  pct(inf) {
    const t = Demo.stats(inf.categoryId).total
    return t > 0 ? (inf.votes / t * 100) : 0
  },
  rank(inf) {
    const list = Demo.byCategory(inf.categoryId, true)
    const i = list.findIndex(x => x.id === inf.id)
    return i >= 0 ? i + 1 : -1
  },

  nominate(d) {
    const db = load()
    const inf = {
      id: uid('inf'), categoryId: d.categoryId,
      name: d.displayName, legalName: d.legalName, handle: d.handle,
      platform: d.platform, profileUrl: d.profileUrl || '',
      email: d.email, mobile: d.mobile, country: d.country, city: d.city,
      followers: d.followers || '', bio: d.bio || '', photo: d.photo || '',
      votes: 0, status: 'submitted', approved: false, reviewNotes: '',
      password: d.password, marketingConsent: !!d.marketingConsent,
      termsVersion: db.settings.termsVersion,
      createdAt: now(), approvedAt: 0, lastVoteAt: 0, updatedAt: now(),
    }
    db.influencers.push(inf)
    db.audit.push({ at: now(), actor: 'system', action: 'nomination_submitted', detail: inf.name + ' → ' + (Demo.category(inf.categoryId) || {}).name })
    save(db); Demo.setSession(inf.id)
    return inf
  },

  setNominationStatus(id, status, notes) {
    const db = load()
    const found = db.influencers.find(x => x.id === id)
    if (found) {
      found.status = status
      found.approved = (status === 'approved')
      found.reviewNotes = notes || ''
      if (status === 'approved' && !found.approvedAt) found.approvedAt = now()
      found.updatedAt = now()
      db.audit.push({ at: now(), actor: 'admin', action: 'nomination_' + status, detail: found.name + (notes ? ' — ' + notes : '') })
      save(db)
    }
    return found || null
  },

  login(email, password) {
    const e = String(email || '').trim().toLowerCase()
    const found = load().influencers.find(x => (x.email || '').toLowerCase() === e && x.password === password)
    if (found) { Demo.setSession(found.id); return found }
    return null
  },
  session() {
    try { const id = localStorage.getItem(SESSION_KEY); return id ? Demo.get(id) : null } catch { return null }
  },
  setSession(id) { try { localStorage.setItem(SESSION_KEY, id) } catch {} },
  clearSession() { try { localStorage.removeItem(SESSION_KEY) } catch {} },

  voteLink(id) {
    const base = (window.location.origin + window.location.pathname).replace(/[^/]*$/, '')
    return base + '#/nominee/' + encodeURIComponent(id)
  },

  normEmail: (e) => String(e || '').trim().toLowerCase(),
  normPhone: (p) => String(p || '').replace(/\D/g, ''),
  findVoter(email, phone) {
    const vs = load().voters || []
    const eh = hashStr('pfa|email|' + Demo.normEmail(email))
    const ph = hashStr('pfa|phone|' + Demo.normPhone(phone))
    return vs.find(v => v.emailHash === eh) || vs.find(v => v.phoneHash === ph) || null
  },
  currentVoter() {
    try {
      const ref = JSON.parse(localStorage.getItem(VOTER_KEY) || 'null')
      if (!ref || !ref.voterId) return null
      return (load().voters || []).find(v => v.id === ref.voterId) || null
    } catch { return null }
  },
  voterChoice(catId) {
    const v = Demo.currentVoter()
    if (!v) return null
    const votes = load().votes
    for (let i = votes.length - 1; i >= 0; i--) {
      if (votes[i].voterId === v.id && votes[i].categoryId === catId && votes[i].status === 'counted') return votes[i].nomineeId
    }
    return null
  },

  registerAndVote(nomineeId, info) {
    const db = load(), s = db.settings, t = now()
    if (t < new Date(s.votingStart).getTime()) return { ok: false, code: 'VOTING_NOT_OPEN' }
    if (t > new Date(s.votingEnd).getTime()) return { ok: false, code: 'VOTING_CLOSED' }
    const name = String((info && info.name) || '').trim()
    const email = Demo.normEmail(info && info.email)
    const phone = Demo.normPhone(info && info.phone)
    if (name.length < 2) return { ok: false, code: 'INVALID_NAME' }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, code: 'INVALID_EMAIL' }
    if (phone.length < 7) return { ok: false, code: 'INVALID_PHONE' }
    const inf = db.influencers.find(x => x.id === nomineeId)
    if (!inf || inf.status !== 'approved') return { ok: false, code: 'NOMINEE_INELIGIBLE' }
    db.voters = db.voters || []
    let voter = Demo.findVoter(email, phone)
    if (!voter) {
      voter = { id: uid('voter'), name, emailHash: hashStr('pfa|email|' + email), phoneHash: hashStr('pfa|phone|' + phone), createdAt: t }
      db.voters.push(voter)
    } else if (name && voter.name !== name) { voter.name = name }
    for (const v of db.votes) {
      if (v.voterId === voter.id && v.categoryId === inf.categoryId && v.status === 'counted') {
        db.audit.push({ at: t, actor: 'voter', action: 'vote_blocked_duplicate', detail: inf.categoryId + ' — repeat attempt by voter …' + String(voter.id).slice(-6) })
        save(db)
        try { localStorage.setItem(VOTER_KEY, JSON.stringify({ voterId: voter.id })) } catch {}
        return { ok: false, code: 'ALREADY_VOTED', nomineeId: v.nomineeId }
      }
    }
    const rec = { id: uid('vote'), nomineeId: inf.id, categoryId: inf.categoryId, voterId: voter.id, at: t, status: 'counted', reason: '' }
    db.votes.push(rec)
    inf.votes += 1; inf.lastVoteAt = t; inf.updatedAt = t
    db.audit.push({ at: t, actor: 'voter', action: 'vote_counted', detail: inf.name + ' (' + inf.categoryId + ')' })
    save(db)
    try { localStorage.setItem(VOTER_KEY, JSON.stringify({ voterId: voter.id })) } catch {}
    return { ok: true, votes: inf.votes }
  },

  recentVotes: (limit) => load().votes.slice().sort((a, b) => b.at - a.at).slice(0, limit || 50),
  invalidateVote(voteId, reason) {
    const db = load()
    const found = db.votes.find(v => v.id === voteId && v.status === 'counted')
    if (!found) return false
    found.status = 'invalidated'; found.reason = reason || ''
    const inf = db.influencers.find(x => x.id === found.nomineeId)
    if (inf) { inf.votes = Math.max(0, inf.votes - 1); inf.updatedAt = now() }
    db.audit.push({ at: now(), actor: 'admin', action: 'vote_invalidated', detail: voteId + ' — ' + (reason || 'no reason') })
    save(db); return true
  },

  votesFor: (nomineeId) => load().votes.filter(v => v.nomineeId === nomineeId && v.status === 'counted'),
  votesInLast(nomineeId, ms) {
    const t = now() - ms
    return Demo.votesFor(nomineeId).filter(v => v.at >= t).length
  },
  votesPerDay(nomineeId, days = 14) {
    const counts = new Array(days).fill(0)
    const d0 = new Date(); d0.setHours(0, 0, 0, 0)
    const list = nomineeId ? Demo.votesFor(nomineeId) : load().votes.filter(v => v.status === 'counted')
    for (const v of list) {
      const dt = new Date(v.at); dt.setHours(0, 0, 0, 0)
      const diff = Math.round((d0 - dt) / 86400000)
      if (diff >= 0 && diff < days) counts[days - 1 - diff]++
    }
    return counts.map((count, i) => {
      const dd = new Date(d0.getTime() - (days - 1 - i) * 86400000)
      let label
      try { label = dd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
      catch { label = (dd.getMonth() + 1) + '/' + dd.getDate() }
      return { label, count }
    })
  },
  votesPerHour(hours = 24) {
    const counts = new Array(hours).fill(0)
    const t0 = now()
    for (const v of load().votes) {
      if (v.status !== 'counted') continue
      const diff = Math.floor((t0 - v.at) / 3600000)
      if (diff >= 0 && diff < hours) counts[hours - 1 - diff]++
    }
    return counts
  },
  newVotersPerDay(days = 7) {
    const counts = new Array(days).fill(0)
    const d0 = new Date(); d0.setHours(0, 0, 0, 0)
    for (const v of (load().voters || [])) {
      const dt = new Date(v.createdAt || now()); dt.setHours(0, 0, 0, 0)
      const diff = Math.round((d0 - dt) / 86400000)
      if (diff >= 0 && diff < days) counts[days - 1 - diff]++
    }
    return counts.map((count, i) => {
      const dd = new Date(d0.getTime() - (days - 1 - i) * 86400000)
      let label
      try { label = dd.toLocaleDateString('en-GB', { weekday: 'short' }) }
      catch { label = 'd' + (i + 1) }
      return { label, count }
    })
  },
  voterStats() {
    const db = load(), vs = db.voters || [], votes = db.votes
    let multi = 0, todayN = 0
    const d0 = new Date(); d0.setHours(0, 0, 0, 0); const t0 = d0.getTime()
    for (const v of vs) {
      const cats = new Set()
      for (const vt of votes) if (vt.voterId === v.id && vt.status === 'counted') cats.add(vt.categoryId)
      if (cats.size > 1) multi++
      if ((v.createdAt || 0) >= t0) todayN++
    }
    const counted = votes.filter(v => v.status === 'counted').length
    return { total: vs.length, counted, avg: vs.length ? counted / vs.length : 0, multi, today: todayN }
  },
  blockedAttempts: () => load().audit.filter(a => a.action === 'vote_blocked_duplicate').length,
  votesByCategory() {
    const out = {}
    CATEGORIES.forEach(c => { out[c.id] = 0 })
    for (const v of load().votes) {
      if (v.status === 'counted' && out[v.categoryId] !== undefined) out[v.categoryId]++
    }
    return out
  },

  publishResults() {
    const db = load(), cats = {}
    CATEGORIES.forEach(c => {
      cats[c.id] = Demo.byCategory(c.id, true).slice(0, 5).map((x, i) => ({
        nomineeId: x.id, name: x.name, rank: i + 1, votes: x.votes,
        title: i === 0 ? 'Category Winner' : 'Top 5 Honouree',
      }))
    })
    db.settings.snapshotVersion += 1
    const snap = { version: db.settings.snapshotVersion, at: now(), by: 'admin', categories: cats }
    db.settings.snapshot = snap
    db.settings.snapshotHistory = [snap, ...(db.settings.snapshotHistory || [])].slice(0, 10)
    db.settings.resultsPublished = true
    db.audit.push({ at: now(), actor: 'admin', action: 'results_published', detail: 'snapshot v' + db.settings.snapshotVersion })
    save(db); return snap
  },
  unpublishResults() {
    const db = load()
    db.settings.resultsPublished = false
    db.audit.push({ at: now(), actor: 'admin', action: 'results_unpublished', detail: '' })
    save(db)
  },

  addRsvp(d) {
    const db = load()
    db.rsvps.push({ id: uid('rsvp'), name: d.name, email: d.email, mobile: d.mobile || '', guests: d.guests || 1, type: d.type || 'guest', at: now(), checkedIn: false })
    save(db)
  },
  addEnquiry(d) {
    const db = load()
    db.enquiries.push({ id: uid('enq'), name: d.name, email: d.email, subject: d.subject || '', message: d.message, at: now(), read: false })
    save(db)
  },
  markEnquiryRead(id) {
    const db = load()
    db.enquiries.forEach(e => { if (e.id === id) e.read = true })
    save(db)
  },
  toggleCheckIn(id) {
    const db = load()
    db.rsvps.forEach(r => { if (r.id === id) r.checkedIn = !r.checkedIn })
    save(db)
  },
  auditLog: (limit) => load().audit.slice().sort((a, b) => b.at - a.at).slice(0, limit || 100),

  /* Demo admin gate. Production: server session + MFA (see api.js).
     These demo credentials must NOT survive production. */
  adminLogin(u, p) {
    if (u === 'admin' && p === 'profluencer2026') {
      try { localStorage.setItem(ADMIN_KEY, '1') } catch {}
      return true
    }
    return false
  },
  isAdmin() { try { return localStorage.getItem(ADMIN_KEY) === '1' } catch { return false } },
  adminLogout() { try { localStorage.removeItem(ADMIN_KEY) } catch {} },

  resetDemo() { try { localStorage.removeItem(DB_KEY) } catch {}; return load() },
}
