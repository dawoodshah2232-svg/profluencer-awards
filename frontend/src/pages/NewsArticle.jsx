import { Link, useParams } from 'react-router-dom'
import { Chip, PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'
import { assetUrl } from '../lib/assets'
import { longDate, shortDate, useDates } from '../lib/dates'

export default function NewsArticle() {
  const { slug } = useParams()
  const dates = useDates()
  const { data: a, loading, error } = useAsync(() => Store.article(slug), [slug])

  if (loading) {
    return <PageHero title="Loading article…" />
  }

  if (error || !a) {
    return (
      <PageHero title={error ? 'Could not load this article' : 'Article not found'} sub={error ? 'Please try again shortly.' : "This story doesn't exist or has moved."}>
        <div style={{ marginTop: 22 }}><Link className="btn btn-gold" to="/news">Back to news</Link></div>
      </PageHero>
    )
  }

  return (
    <>
      <PageHero>
        <div className="news-wrap">
          <span className="eyebrow">News &amp; Insights{a.date ? <> &middot; {a.date}</> : null}</span>
          <h1 className="sec-title">{a.title}</h1>
          <div className="article-meta">
            {a.tag && <Chip>{a.tag}</Chip>}
            {a.read && <span>{a.read}</span>}
            <span>By ProFluencer Editorial</span>
          </div>
        </div>
      </PageHero>
      <section style={{ paddingTop: 0 }}>
        <div className="container news-wrap">
          {a.img && <div className="article-hero"><img src={assetUrl(a.img)} alt={a.alt} /></div>}
          {/* Article HTML is authored by staff in the admin CRM. */}
          <div className="prose" dangerouslySetInnerHTML={{ __html: a.body || '' }} />
          <div className="cta-band">
            <span className="eyebrow">Nominations are open</span>
            <h3>Your audience can put you on that stage.</h3>
            <p>Nomination is free and takes minutes. Get approved, get your voting link, and let your community carry you to the awards afternoon in {dates.ceremonyCity} on {longDate(dates.ceremonyDate)}. Voting runs {shortDate(dates.votingStart)} – {longDate(dates.votingEnd)}.</p>
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
