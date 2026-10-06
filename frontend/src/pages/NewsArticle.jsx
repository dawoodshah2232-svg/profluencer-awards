import { Link, useParams } from 'react-router-dom'
import { Chip, PageHero } from '../components/ui'
import { ARTICLES } from '../data/news'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

export default function NewsArticle() {
  const { slug } = useParams()
  const a = ARTICLES.find((x) => x.slug === slug)

  if (!a) {
    return (
      <PageHero title="Article not found" sub="This story doesn't exist or has moved.">
        <div style={{ marginTop: 22 }}><Link className="btn btn-gold" to="/news">Back to news</Link></div>
      </PageHero>
    )
  }

  return (
    <>
      <PageHero>
        <div className="news-wrap">
          <span className="eyebrow">News &amp; Insights &middot; {a.date}</span>
          <h1 className="sec-title">{a.title}</h1>
          <div className="article-meta">
            <Chip>{a.tag}</Chip>
            <span>{a.read}</span>
            <span>By ProFluencer Editorial</span>
          </div>
        </div>
      </PageHero>
      <section style={{ paddingTop: 0 }}>
        <div className="container news-wrap">
          <div className="article-hero"><img src={img(a.img)} alt={a.alt} /></div>
          <div className="prose" dangerouslySetInnerHTML={{ __html: a.body }} />
          <div className="cta-band">
            <span className="eyebrow">Nominations are open</span>
            <h3>Your audience can put you on that stage.</h3>
            <p>Nomination is free and takes minutes. Get approved, get your voting link, and let your community carry you to the awards afternoon in Dubai on 11 December. Voting runs 15 October – 30 November 2026.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn btn-gold" to="/nominate">Nominate Yourself</Link>
              <Link className="btn btn-ghost" to="/news">More news &amp; insights</Link>
            </div>
          </div>
          <div className="article-tags">
            <Chip>ProFluencer Awards 2026</Chip>
            <Chip>Creator Economy</Chip>
          </div>
        </div>
      </section>
    </>
  )
}
