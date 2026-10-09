import { Link } from 'react-router-dom'
import { PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'
import { assetUrl } from '../lib/assets'

export default function News() {
  const { data: articles = [], loading, error } = useAsync(() => Store.content('news'), [])

  return (
    <>
      <PageHero
        eyebrow="Stay in the loop"
        title="News & Insights"
        sub="Creator economy data, industry shifts, and everything happening at ProFluencer Awards 2026 — written for the creators living it."
      />
      <section style={{ paddingTop: 0 }}>
        <div className="container">
          {loading && <p className="hint">Loading articles…</p>}
          {error && <p className="hint">Could not load articles right now. Please try again shortly.</p>}
          {!loading && !error && !articles.length && <p className="hint">No articles published yet.</p>}
          <div className="news-grid">
            {articles.map((a) => (
              <Link className="news-card" key={a.id} to={`/news/${a.slug}`}>
                <div className="ph">{a.img && <img loading="lazy" src={assetUrl(a.img)} alt={a.alt} />}</div>
                <div className="body">
                  <span className="date">{[a.date, a.tag].filter(Boolean).join(' · ')}</span>
                  <h3>{a.title}</h3>
                  <p>{a.excerpt}</p>
                  <span className="read">Read the article &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
