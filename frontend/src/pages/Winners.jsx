import { Link } from 'react-router-dom'
import { Avatar, PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

export default function Winners() {
  const { data: cats = [] } = useAsync(() => Store.categories(), [])
  const { data: snapshot } = useAsync(() => Store.resultSnapshot(), [])

  const published = !!snapshot

  return (
    <>
      <PageHero
        eyebrow="Official results"
        title="Winners of 2026"
        sub={published
          ? `Published ${new Date(snapshot.at).toLocaleDateString()} · snapshot v${snapshot.version} · 50 trophies across 10 industries.`
          : 'Voting closed November 30, 2026. Results are under final verification and will be published here after the ceremony on December 11, 2026.'}
      >
        <Link className="btn btn-gold" to="/event" style={{ marginTop: 22 }}>RSVP for the Ceremony</Link>
      </PageHero>

      <section style={{ paddingTop: 10 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          {cats.map((c) => {
            const rows = published ? (snapshot.categories[c.id] || []) : []
            return (
              <div className="lb" style={{ marginBottom: 22 }} key={c.id}>
                <div className="lb-head">
                  <h3>{c.name}</h3>
                  <span className="chip">{published ? '5 honourees' : 'Pending'}</span>
                </div>
                <div>
                  {published ? rows.map((r, i) => (
                    <div className="lb-row" key={r.nomineeId}>
                      <div className={`rank${i === 0 ? ' r1' : ''}`}>{r.rank}</div>
                      <Avatar name={r.name} />
                      <div className="lb-info"><b>{r.name}</b><span>{r.title}</span></div>
                      <div className="lb-votes"><b>{Store.fmt(r.votes)}</b><span>votes</span></div>
                    </div>
                  )) : (
                    <div className="lb-row"><div className="lb-info"><span>Results pending — announced live on stage, Dec 11.</span></div></div>
                  )}
                </div>
              </div>
            )
          })}
          {!published && (
            <p className="hint center" style={{ marginTop: 8 }}>
              Demo preview: no real results exist yet. Publishing happens from the Admin CRM after verification.
            </p>
          )}
        </div>
      </section>
    </>
  )
}
