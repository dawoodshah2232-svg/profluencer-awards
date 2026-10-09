import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import PanelShell from '../components/PanelShell'
import { Btn } from '../components/AdminUI'
import Icon from '../components/Icons'
import { Field } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store, getMode, isDemoMode } from '../lib/store'
import Dashboard from './admin/Dashboard'
import Nominees from './admin/Nominees'
import Categories from './admin/Categories'
import { Votes, Voters } from './admin/Votes'
import Results from './admin/Results'
import Rsvps from './admin/Rsvps'
import Enquiries from './admin/Enquiries'
import ContentManager from './admin/Content'
import Users from './admin/Users'
import { Settings, Audit } from './admin/Settings'
import '../admin.css'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

const SECTIONS = {
  dashboard: { title: 'Dashboard', sub: 'Edition overview and live integrity signals', icon: 'home' },
  nominees: { title: 'Nominees', sub: 'Influencer profiles, approvals and edits', icon: 'users' },
  categories: { title: 'Categories', sub: 'Award categories shown on the website', icon: 'grid' },
  results: { title: 'Results', sub: 'Rankings and result publication', icon: 'trophy' },
  votes: { title: 'Votes', sub: 'Vote ledger and fraud control', icon: 'badge' },
  voters: { title: 'Voters', sub: 'Voter registrations and engagement', icon: 'user' },
  rsvps: { title: 'Ceremony RSVPs', sub: 'Guest list and door check-in', icon: 'calendar' },
  news: { title: 'News articles', sub: 'News & Insights page', icon: 'news' },
  sponsors: { title: 'Sponsorship tiers', sub: 'Sponsors page content', icon: 'briefcase' },
  faqs: { title: 'FAQs', sub: 'FAQ page and home page questions', icon: 'question' },
  enquiries: { title: 'Enquiries', sub: 'Contact and sponsorship messages', icon: 'inbox' },
  users: { title: 'Users & logins', sub: 'Admin and client accounts', icon: 'key' },
  settings: { title: 'Settings', sub: 'Dates, ceremony and edition details', icon: 'cog' },
  audit: { title: 'Audit log', sub: 'Every admin action, append-only', icon: 'clipboard' },
}
const GROUPS = [
  ['', ['dashboard']],
  ['Awards', ['nominees', 'categories', 'results']],
  ['Voting', ['votes', 'voters']],
  ['Event', ['rsvps']],
  ['Website', ['news', 'sponsors', 'faqs']],
  ['Inbox', ['enquiries']],
  ['System', ['users', 'settings', 'audit']],
]

function AdminLogin({ onDone }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const login = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const ok = await Store.adminLogin(user.trim(), pass)
      if (ok) onDone()
      else setError('Invalid credentials.')
    } catch (err) {
      setError(err && err.status === 422 ? 'Email or password is incorrect.' : 'Could not sign in. Try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="auth">
      <div className="auth-art" style={{ backgroundImage: `url(${img('img/ceremony.jpg')})` }}>
        <div className="inner">
          <span className="eyebrow">Organiser CRM</span>
          <h2>Run the ProFluencer Awards from one place.</h2>
          <p>Nominees, categories, votes, results, ceremony guests and every page of website content.</p>
        </div>
      </div>
      <div className="auth-form">
        <form className="auth-card pnl" style={{ minHeight: 0, background: 'none' }} onSubmit={login} noValidate>
          <img className="logo" src={img('img/logo-clean.png')} alt="ProFluencer Awards" />
          <h1>Admin sign in</h1>
          <p className="lead">Staff accounts are issued by the awards team.</p>
          <div className={`form-error${error ? ' show' : ''}`}>{error}</div>
          <Field label="Email"><input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" placeholder="you@company.com" /></Field>
          <Field label="Password"><input value={pass} onChange={(e) => setPass(e.target.value)} type="password" autoComplete="current-password" /></Field>
          <button className="abtn primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          {isDemoMode() && <p className="hint" style={{ marginTop: 12, textAlign: 'center' }}>Demo access: admin / profluencer2026</p>}
          <Link className="back" to="/"><Icon name="globe" size={16} />Back to the website</Link>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const { section = 'dashboard' } = useParams()
  const [authed, setAuthed] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const bump = () => setRefreshKey((k) => k + 1)

  useAsync(async () => {
    const ok = await Store.isAdmin()
    setAuthed(!!ok)
    return ok
  }, [])
  /* A stored token can expire or be revoked: a 401 sends the user back to sign-in. */
  const { data: me } = useAsync(() => (authed ? Store.adminMe().catch((e) => {
    if (e && e.status === 401) Store.adminLogout().then(() => setAuthed(false))
    return null
  }) : null), [authed])
  const { data: enqs = [] } = useAsync(() => (authed ? Store.enquiries().catch(() => []) : []), [authed, refreshKey])
  const { data: noms = [] } = useAsync(() => (authed ? Store.allNominees().catch(() => []) : []), [authed, refreshKey])
  const { data: state } = useAsync(() => (authed ? Store.votingState().catch(() => null) : null), [authed, refreshKey])

  if (authed === null) return <div className="pnl" style={{ padding: 40 }}><p className="hint">Loading…</p></div>
  if (!authed) return <AdminLogin onDone={() => setAuthed(true)} />
  if (!SECTIONS[section]) return <Navigate to="/admin" replace />

  const logout = async () => {
    await Store.adminLogout()
    setAuthed(false)
    navigate('/admin', { replace: true })
  }

  const badges = {
    nominees: noms.filter((n) => n.status === 'pending' || n.status === 'submitted').length,
    enquiries: enqs.filter((e) => !e.read).length,
  }
  const nav = GROUPS.map(([label, keys]) => ({
    label,
    items: keys
      .filter((k) => k !== 'users' || !me || me.role !== 'editor')
      .map((k) => ({ key: k, label: SECTIONS[k].title, icon: SECTIONS[k].icon, to: k === 'dashboard' ? '/admin' : `/admin/${k}`, badge: badges[k] })),
  }))
  const cur = SECTIONS[section]
  const props = { refreshKey, onChanged: bump }

  return (
    <PanelShell
      portal="Admin"
      nav={nav}
      active={section}
      title={cur.title}
      subtitle={cur.sub}
      user={me ? { name: me.name, role: String(me.role || '').replace(/_/g, ' ') } : { name: 'Admin', role: getMode() === 'demo' ? 'demo' : '' }}
      onLogout={logout}
      actions={<>
        <span className={`tag ${state === 'open' ? 'green' : state === 'upcoming' ? 'blue' : 'amber'} hide-sm`}>Voting {state || '…'}</span>
        <Btn icon="refresh" onClick={bump} aria-label="Refresh data" />
      </>}
    >
      {section === 'dashboard' && <Dashboard {...props} />}
      {section === 'nominees' && <Nominees {...props} />}
      {section === 'categories' && <Categories {...props} />}
      {section === 'results' && <Results {...props} />}
      {section === 'votes' && <Votes {...props} />}
      {section === 'voters' && <Voters {...props} />}
      {section === 'rsvps' && <Rsvps {...props} />}
      {section === 'news' && <ContentManager type="news" {...props} />}
      {section === 'sponsors' && <ContentManager type="sponsor_tier" {...props} />}
      {section === 'faqs' && <ContentManager type="faq" {...props} />}
      {section === 'enquiries' && <Enquiries {...props} />}
      {section === 'users' && <Users {...props} />}
      {section === 'settings' && <Settings {...props} />}
      {section === 'audit' && <Audit {...props} />}
    </PanelShell>
  )
}
