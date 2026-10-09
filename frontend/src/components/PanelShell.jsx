import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icons'
import { Avatar } from './ui'
import { isApiReachable, subscribeApiReachable } from '../lib/api'
import '../admin.css'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

/* App-style shell for the admin CRM and the influencer portal:
   fixed sidebar (off-canvas below 1024px) + sticky top bar.
   nav = [{ label, items: [{ key, label, icon, to, badge }] }] */
export default function PanelShell({ portal, nav, active, title, subtitle, actions, user, onLogout, children }) {
  const [open, setOpen] = useState(false)
  const [offline, setOffline] = useState(() => !isApiReachable())

  useEffect(() => subscribeApiReachable((ok) => setOffline(!ok)), [])
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [active])
  useEffect(() => {
    document.body.classList.add('pnl-body')
    return () => document.body.classList.remove('pnl-body')
  }, [])

  return (
    <div className={`pnl${open ? ' nav-open' : ''}`}>
      <a className="skip-link" href="#pnl-main">Skip to content</a>
      <aside className="pnl-side" aria-label={`${portal} navigation`}>
        <div className="pnl-brand">
          <Link to="/" aria-label="ProFluencer Awards website"><img src={img('img/logo-clean.png')} alt="ProFluencer Awards" /></Link>
          <span className="pnl-portal">{portal}</span>
          <button className="pnl-x" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <nav className="pnl-nav">
          {nav.map((g) => (
            <div className="pnl-group" key={g.label}>
              {g.label && <div className="pnl-group-label">{g.label}</div>}
              {g.items.map((it) => (
                <Link key={it.key} to={it.to} className={`pnl-link${active === it.key ? ' active' : ''}`}
                  aria-current={active === it.key ? 'page' : undefined}>
                  <Icon name={it.icon} />
                  <span>{it.label}</span>
                  {it.badge ? <em className="pnl-badge">{it.badge}</em> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="pnl-side-foot">
          <Link className="pnl-link" to="/"><Icon name="globe" /><span>View website</span></Link>
          {onLogout && <button className="pnl-link" onClick={onLogout}><Icon name="logout" /><span>Log out</span></button>}
        </div>
      </aside>
      <div className="pnl-scrim" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="pnl-main">
        <header className="pnl-top">
          <button className="pnl-burger" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Icon name="menu" size={22} /></button>
          <div className="pnl-title">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="pnl-top-actions">
            {actions}
            {user && (
              <div className="pnl-user">
                <Avatar name={user.name} photo={user.photo} size={36} />
                <div className="pnl-user-meta"><b>{user.name}</b><span>{user.role}</span></div>
              </div>
            )}
          </div>
        </header>
        {offline && (
          <div className="pnl-offline" role="alert">
            Cannot reach the awards server — data shown may be outdated.
            <button type="button" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
        <main id="pnl-main" className="pnl-content">{children}</main>
      </div>
    </div>
  )
}
