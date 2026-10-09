import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { shortDate, shortDateYear, useDates } from '../lib/dates'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

/* ---------- toast ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('')
  const timer = useRef(null)
  const toast = useCallback((m) => {
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 2600)
  }, [])
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={`toast${msg ? ' show' : ''}`} role="status">{msg}</div>
    </ToastCtx.Provider>
  )
}

/* ---------- header ---------- */
const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/categories', label: 'Categories' },
  { to: '/nominees', label: 'Nominees' },
  { to: '/event', label: 'Event' },
  { to: '/sponsors', label: 'Sponsors' },
  { to: '/news', label: 'News' },
  { to: '/contact', label: 'Contact' },
]

function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container nav-inner">
          <Link className="brand" to="/" aria-label="ProFluencer Awards home">
            <img src={img('img/logo-clean.png')} alt="ProFluencer Awards Dubai 2026 logo" />
          </Link>
          <nav className="nav-links" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Link className="btn btn-gold btn-sm nav-cta" to="/login">Influencer Login</Link>
          <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </header>
      <div className={`mobile-menu${open ? ' open' : ''}`}>
        {NAV.map((n) => (
          <Link key={n.to} to={n.to}>{n.label}</Link>
        ))}
        <Link to="/login" style={{ color: 'var(--gold-lt)', fontWeight: 800 }}>Influencer Login</Link>
        <Link to="/admin" style={{ color: 'var(--muted)' }}>Admin Portal</Link>
      </div>
    </>
  )
}

/* ---------- footer ---------- */
function Footer() {
  const y = new Date().getFullYear()
  const dates = useDates()
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="foot-grid">
          <div>
            <Link className="brand" to="/" style={{ marginBottom: 14 }}>
              <img src={img('img/logo-clean.png')} alt="ProFluencer Awards Dubai 2026 logo" style={{ height: 78 }} />
            </Link>
            <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 300, marginTop: 12 }}>
              The region&rsquo;s most prestigious celebration of digital influence. 10 industries, 50 awards, decided by public vote.
            </p>
          </div>
          <div>
            <h4>Awards</h4>
            <Link to="/categories">Categories</Link>
            <Link to="/nominees">Nominee Directory</Link>
            <Link to="/voting">How Voting Works</Link>
            <Link to="/winners">Results</Link>
            <Link to="/nominate">Nominate Yourself</Link>
          </div>
          <div>
            <h4>Portals</h4>
            <Link to="/login">Influencer Login</Link>
            <Link to="/dashboard">My Dashboard</Link>
            <Link to="/event">Ceremony &amp; RSVP</Link>
            <Link to="/sponsors">Sponsors</Link>
            <Link to="/admin">Admin Portal</Link>
          </div>
          <div>
            <h4>Support</h4>
            <Link to="/contact">Contact Us</Link>
            <Link to="/terms">Terms &amp; Voting Rules</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
        <div className="foot-bottom">
          <span>&copy; {y} ProFluencer Awards &middot; profluencerawards.com</span>
          <span>Voting {shortDate(dates.votingStart)} &ndash; {shortDateYear(dates.votingEnd)} &middot; Ceremony {shortDateYear(dates.ceremonyDate)}</span>
        </div>
      </div>
    </footer>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function Layout({ children, demoMode, offline }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      {demoMode && (
        <div className="demo-banner" style={{ paddingTop: 108 }}>
          Demo preview — sample nominees and votes shown are not real.
        </div>
      )}
      {offline && !demoMode && (
        <div className="offline-banner" role="alert">
          <span>Cannot reach the awards server. Check your connection — data shown may be outdated.</span>
          <button type="button" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      <ScrollToTop />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  )
}
