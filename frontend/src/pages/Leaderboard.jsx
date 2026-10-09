import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, PageHero } from '../components/ui'
import { useAsync, useInterval } from '../lib/hooks'
import { Store } from '../lib/store'
import { assetUrl } from '../lib/assets'
import { longDate, shortDate, useDates } from '../lib/dates'

/* Public leaderboard: every category, every approved nominee. Vote counts
   appear while voting is live and after results are published; the API
   withholds them otherwise. Refreshes every 30 seconds. */
export default function Leaderboard() {
  const dates = useDates()
  const [tick, setTick] = useState(0)
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const { data, loading, error } = useAsync(() => Store.leaderboard(), [tick])
  useInterval(() => setTick((t) => t + 1), 30000)

  const cats = (data && data.categories) || []
  const visible = !!(data && data.visible)
  const published = !!(data && data.results_published)
  const nomineeCount = cats.reduce((a, c) => a + c.nominees.length, 0)
  const term = q.trim().toLowerCase()
  const shown = cats
    .filter((c) => cat === 'all' || String(c.id) === String(cat))
    .map((c) => ({ ...c, rows: c.nominees.filter((n) => !term || [n.name, n.handle].join(' ').toLowerCase().includes(term)) }))
    .filter((c) => !term || c.rows.length)

  const status = published
    ? { tone: 'gold', label: 'Official results' }
    : visible ? { tone: 'live', label: 'Live · updates every 30s' } : { tone: '', label: `Opens ${shortDate(dates.votingStart)}` }

  return (
    <>
      <PageHero
        eyebrow={published ? 'Official results' : 'Live standings'}
        title="Leaderboard"
        sub={published
          ? 'Winners confirmed by the awards team after vote verification. Full vote totals below.'
          : visible
            ? 'Verified, counted votes for every nominee. Provisional until the awards team publishes the final results.'
            : `Every approved nominee is listed below. Vote counts go live when voting opens on ${longDate(dates.votingStart)}.`}
      >
        <div className="lbd-stats">
          <div><b>{visible && data ? Store.fmt(data.total_votes || 0) : '—'}</b><span>Verified votes</span></div>
          <div><b>{nomineeCount}</b><span>Nominees</span></div>
          <div><b>{cats.length}</b><span>Categories</span></div>
          <div><span className={`lbd-status ${status.tone}`}><i />{status.label}</span></div>
        </div>
      </PageHero>

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="lbd-tools">
            <div className="lbd-tabs" role="tablist" aria-label="Category">
              <button role="tab" aria-selected={cat === 'all'} className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>All categories</button>
              {cats.map((c) => (
                <button key={c.id} role="tab" aria-selected={String(cat) === String(c.id)} className={String(cat) === String(c.id) ? 'on' : ''} onClick={() => setCat(c.id)}>{c.name}</button>
              ))}
            </div>
            <input className="lbd-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a nominee…" aria-label="Find a nominee" />
          </div>

          {loading && !data && <p className="hint">Loading the leaderboard…</p>}
          {error && <p className="hint">Could not load the leaderboard right now. Please try again shortly.</p>}

          <div className="lbd-grid">
            {shown.map((c) => (
              <div className="lb" key={c.id} style={{ marginTop: 0 }}>
                <div className="lb-head">
                  <h3>{c.name}</h3>
                  <span className="chip">{visible ? `${Store.fmt(c.total_votes || 0)} votes` : `${c.nominees.length} nominees`}</span>
                </div>
                <div>
                  {c.rows.map((n, i) => (
                    <Link to={`/nominee/${n.id}`} className={`lb-row lbd-row${n.award === 'Category Winner' ? ' winner' : ''}`} key={n.id}>
                      <div className={`rank${visible && i === 0 ? ' r1' : ''}`}>{visible ? n.position : i + 1}</div>
                      <Avatar name={n.name} photo={assetUrl(n.photo_url)} />
                      <div className="lb-info">
                        <b>{n.name}</b>
                        <span>{n.award ? <em className={`lbd-award${n.award === 'Category Winner' ? ' gold' : ''}`}>{n.award}</em> : null}{[n.handle, n.platform].filter(Boolean).join(' · ')}</span>
                        {visible && <div className="bar"><i style={{ width: `${n.share || 0}%` }} /></div>}
                      </div>
                      <div className="lb-votes">
                        {visible ? <><b>{Store.fmt(n.votes_count)}</b><span>{(n.share || 0).toFixed(1)}%</span></> : <span className="lbd-vote">Vote</span>}
                      </div>
                    </Link>
                  ))}
                  {!c.rows.length && <div className="lb-row"><div className="lb-info"><span>No approved nominees yet.</span></div></div>}
                </div>
              </div>
            ))}
          </div>

          <div className="center mt" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-gold" to="/nominees">Vote for a nominee</Link>
            {published ? <Link className="btn btn-ghost" to="/winners">See the winners</Link> : <Link className="btn btn-ghost" to="/voting">How voting works</Link>}
          </div>
        </div>
      </section>
    </>
  )
}
