import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icons'
import '../admin.css'
import '../auth.css'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

/* Full-screen split layout for sign-in, registration and password pages:
   artwork on the left (hidden on phones), the form on the right with the
   project logo centred above it. */
export default function AuthLayout({ title, sub, children, footer, wide = false, art = 'img/ceremony.jpg', artTitle, artText }) {
  return (
    <div className="au">
      <aside className="au-art" style={{ backgroundImage: `url(${img(art)})` }}>
        <div className="au-art-inner">
          <span className="au-chip">ProFluencer Awards 2026 &middot; Dubai</span>
          <h2>{artTitle || 'Your audience can carry you to the stage.'}</h2>
          <p>{artText || '10 industries. 50 golden trophies. Decided by verified public vote — no juries, no politics.'}</p>
          <ul className="au-points">
            <li><Icon name="shield" size={18} />Every nomination verified by the awards team</li>
            <li><Icon name="badge" size={18} />Email-verified votes, one per person per category</li>
            <li><Icon name="chart" size={18} />Live dashboard, voting link and QR code</li>
          </ul>
        </div>
      </aside>
      <main className="au-main">
        <div className={`au-card${wide ? ' wide' : ''}`}>
          <Link to="/" className="au-logo" aria-label="ProFluencer Awards home">
            <img src={img('img/logo-clean.png')} alt="ProFluencer Awards Dubai 2026" />
          </Link>
          {title && <h1>{title}</h1>}
          {sub && <p className="au-sub">{sub}</p>}
          {children}
          {footer && <div className="au-foot">{footer}</div>}
          <Link className="au-back" to="/"><Icon name="globe" size={15} />Back to the website</Link>
        </div>
      </main>
    </div>
  )
}

/* "or" divider between manual sign-in and Google. */
export function OrDivider() {
  return <div className="au-or"><span>or</span></div>
}

/* Password input with a show/hide toggle. */
export function PasswordInput({ value, onChange, autoComplete = 'current-password', placeholder = 'Your password', id }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="au-pass">
      <input id={id} type={shown ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} />
      <button type="button" className={shown ? 'on' : ''} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}
        onClick={() => setShown((s) => !s)}><Icon name="eye" size={18} /></button>
    </div>
  )
}
