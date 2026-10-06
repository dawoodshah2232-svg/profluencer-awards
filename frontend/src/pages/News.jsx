import { Link } from 'react-router-dom'
import { PageHero } from '../components/ui'
import { ARTICLES } from '../data/news'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

export default function News() {
  return (
    <>
      <PageHero
        eyebrow="Stay in the loop"
        title="News & Insights"
        sub="Creator economy data, industry shifts, and everything happening at ProFluencer Awards 2026 — written for the creators living it."
      />
      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="news-grid">
            {ARTICLES.map((a) => (
              <Link className="news-card" key={a.slug} to={`/news/${a.slug}`}>
                <div className="ph"><img loading="lazy" src={img(a.img)} alt={a.alt} /></div>
                <div className="body">
                  <span className="date">{a.date} &middot; {a.tag}</span>
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
