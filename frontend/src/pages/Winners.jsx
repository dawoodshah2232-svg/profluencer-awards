import { Link } from 'react-router-dom'
import { Avatar, PageHero } from '../components/ui'
import Icon from '../components/Icons'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'
import { assetUrl } from '../lib/assets'
import { longDate, useDates } from '../lib/dates'

/* Official winners, as confirmed and published by the awards team. */
export default function Winners() {
  const dates = useDates()
  const { data: cats = [] } = useAsync(() => Store.categories(), [])
  const { data: snapshot, loading } = useAsync(() => Store.resultSnapshot(), [])
  const published = !!snapshot

  return (
    <>
      <PageHero
        eyebrow="Official results"
        title="Winners of 2026"
        sub={published
          ? `Confirmed by the awards team after vote verification · published ${new Date(snapshot.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
          : `Results are verified by the awards team after voting closes on ${longDate(dates.votingEnd)}, then announced on stage on ${longDate(dates.ceremonyDate)} and published here.`}
      >
        <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn btn-gold" to="/leaderboard">Full leaderboard</Link>
          <Link className="btn btn-ghost" to="/event">Ceremony &amp; RSVP</Link>
        </div>
      </PageHero>

      <section style={{ paddingTop: 10 }}>
        <div className="container">
          {loading && <p className="hint">Loading results…</p>}
          <div className="win-grid">
            {cats.map((c) => {
              const rows = published ? (snapshot.categories[c.id] || []) : []
              const [winner, ...rest] = rows
              return (
                <div className="win-card" key={c.id}>
                  <div className="win-head"><span>{c.name}</span></div>
                  {winner ? (
                    <Link to={`/nominee/${winner.nomineeId}`} className="win-top">
                      <div className="win-trophy"><Icon name="trophy" size={22} /></div>
                      <Avatar name={winner.name} photo={assetUrl(winner.photo)} size={84} />
                      <div className="win-meta">
                        <em>Category Winner</em>
                        <b>{winner.name}</b>
                        <span>{[winner.handle, `${Store.fmt(winner.votes)} votes`].filter(Boolean).join(' · ')}</span>
                      </div>
                    </Link>
                  ) : (
                    <div className="win-pending"><Icon name="sparkles" size={22} />{published ? 'No winner in this category.' : `Announced live on ${longDate(dates.ceremonyDate)}`}</div>
                  )}
                  {rest.map((r) => (
                    <Link to={`/nominee/${r.nomineeId}`} className="lb-row" key={r.nomineeId}>
                      <div className="rank">{r.rank}</div>
                      <Avatar name={r.name} photo={assetUrl(r.photo)} />
                      <div className="lb-info"><b>{r.name}</b><span>{r.title}</span></div>
                      <div className="lb-votes"><b>{Store.fmt(r.votes)}</b><span>votes</span></div>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
