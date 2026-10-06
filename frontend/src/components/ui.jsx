import { useState } from 'react'

export function PageHero({ eyebrow, title, sub, children, narrow = false }) {
  return (
    <div className="page-hero">
      <div className="container" style={narrow ? { maxWidth: 800 } : undefined}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="sec-title">{title}</h1>
        {sub && <p className="sec-sub">{sub}</p>}
        {children}
      </div>
    </div>
  )
}

export function Panel({ title, sub, children, style, gold = false }) {
  return (
    <div className="panel" style={{ ...(gold ? { borderColor: 'var(--gold)' } : {}), ...style }}>
      {title && <h3>{title}</h3>}
      {sub && <p className="sub">{sub}</p>}
      {children}
    </div>
  )
}

export function Kpi({ value, label, sub }) {
  return (
    <div className="kpi">
      <b>{value}</b>
      <span>{label}</span>
      {sub && <small>{sub}</small>}
    </div>
  )
}

export function Avatar({ name, photo, size, style }) {
  const s = size ? { width: size, height: size, fontSize: Math.round(size * 0.38) } : {}
  if (photo) {
    return (
      <div className="avatar" style={{ padding: 0, overflow: 'hidden', flex: 'none', ...s, ...style }}>
        <img src={photo} alt={name || 'Profile'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  const init = String(name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return <div className="avatar" style={{ ...s, ...style }}>{init}</div>
}

export function StatusPill({ status }) {
  return <span className={`status-pill ${status}`}>{String(status).replace(/_/g, ' ')}</span>
}

export function Chip({ children }) {
  return <span className="chip">{children}</span>
}

export function Pill({ ok, children }) {
  return <span className={`pill ${ok ? 'ok' : 'pend'}`}>{children}</span>
}

export function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {q}<span className="pm">{open ? '–' : '+'}</span>
      </button>
      <div className="ans">{a}</div>
    </div>
  )
}

export function EmptyState({ children }) {
  return <p className="hint" style={{ padding: '12px 0' }}>{children}</p>
}

export function Field({ label, hint, children, noMargin }) {
  return (
    <div className="field" style={noMargin ? { margin: 0 } : undefined}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}
