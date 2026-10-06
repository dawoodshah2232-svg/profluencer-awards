/* Lightweight SVG-free charts (pure divs) — keeps the bundle lean. */

/* Vertical bar chart: data = [{ label, count }] */
export function VBarChart({ data = [], highlightLast = false, small = false }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div>
      <div className={`vchart${small ? ' sm' : ''}`}>
        {data.map((d, i) => {
          const h = Math.max(3, Math.round((d.count / max) * (small ? 84 : 128)))
          const cls = highlightLast && i === data.length - 1 ? 'vbar today' : 'vbar'
          return (
            <div className={cls} key={i} title={`${d.label}: ${d.count}`}>
              <i style={{ height: h }} />
              <span>{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Horizontal bars: rows = [{ label, value }] */
export function HBars({ rows = [] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div>
      {rows.map((r, i) => {
        const w = Math.max(2, Math.round((r.value / max) * 100))
        return (
          <div className="hbar-row" key={i}>
            <span className="lbl" title={r.label}>{r.label}</span>
            <div className="hbar-track"><div className="hbar-fill" style={{ width: `${w}%` }} /></div>
            <span className="num">{r.display != null ? r.display : r.value}</span>
          </div>
        )
      })}
    </div>
  )
}

/* Compact hourly bars for the 24h velocity strip. data = [counts] */
export function HourlyBars({ data = [] }) {
  const max = Math.max(1, ...data)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70, marginTop: 8 }}>
      {data.map((c, i) => {
        const h = Math.max(2, Math.round((c / max) * 64))
        return (
          <div
            key={i}
            style={{ flex: 1, background: 'linear-gradient(180deg,var(--gold-lt),var(--gold))', borderRadius: '3px 3px 1px 1px', height: h }}
            title={`${c} votes`}
          />
        )
      })}
    </div>
  )
}
