import { useEffect } from 'react'
import Icon from './Icons'

/* Small building blocks shared by the admin CRM and the influencer portal. */

export function Card({ title, sub, right, children, flush = false, style }) {
  return (
    <section className={`acard${flush ? ' flush' : ''}`} style={style}>
      {(title || right) && (
        <div className="acard-head">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <p className="sub">{sub}</p>}
          </div>
          {right && <div className="right">{right}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatCard({ icon, value, label, sub, tone = '' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="si"><Icon name={icon} size={20} /></div>
      <div>
        <b>{value}</b>
        <span>{label}</span>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  )
}

export function PageIntro({ children, right }) {
  return (
    <div className="page-intro">
      <p>{children}</p>
      {right && <div className="right">{right}</div>}
    </div>
  )
}

export function Btn({ icon, children, variant = '', size = '', ...rest }) {
  return (
    <button type="button" className={`abtn ${variant} ${size} ${!children ? 'icon' : ''}`} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="asearch grow">
      <Icon name="search" />
      <input className="ainput" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function Empty({ icon = 'inbox', children }) {
  return <div className="empty-box"><Icon name={icon} />{children}</div>
}

const TAG_TONE = {
  approved: 'green', counted: 'green', published: 'green', live: 'green', yes: 'green',
  pending: 'blue', submitted: 'blue', new: 'gold',
  changes_requested: 'amber', held: 'amber', draft: 'amber',
  rejected: 'red', invalidated: 'red', disqualified: 'red',
  super_admin: 'gold', admin: 'gold', editor: 'blue', influencer: 'green',
}
export function Tag({ children, tone }) {
  const key = String(children || '').toLowerCase()
  return <span className={`tag ${tone || TAG_TONE[key] || ''}`}>{String(children || '').replace(/_/g, ' ')}</span>
}

/* Modal dialog. Closes on Escape and backdrop click. */
export function Modal({ title, onClose, children, footer, wide = false, xl = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="amodal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`amodal${wide ? ' wide' : ''}${xl ? ' xl' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="amodal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="amodal-body">{children}</div>
        {footer && <div className="amodal-foot">{footer}</div>}
      </div>
    </div>
  )
}

/* Human-readable message from an API error (validation errors included). */
export function errorText(e, fallback = 'Something went wrong. Try again.') {
  const p = e && e.payload
  if (p && p.errors) {
    const first = Object.values(p.errors)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return (e && e.message) || fallback
}
