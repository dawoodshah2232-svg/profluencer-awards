import { Link } from 'react-router-dom'
import Countdown from '../components/Countdown'
import { FaqItem } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'
import { assetUrl } from '../lib/assets'
import { monthDay, shortDate, shortDateYear, useDates, weekdayDate } from '../lib/dates'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

export default function Home() {
  const dates = useDates()
  const { data: cats = [] } = useAsync(() => Store.categories(), [])
  const { data: counts } = useAsync(async () => {
    const list = await Store.categories()
    const out = {}
    for (const c of list) out[c.id] = await Store.approvedCount(c.id)
    return out
  }, [])
  const { data: faqs = [] } = useAsync(() => Store.content('faq').then((l) => {
    const home = l.filter((f) => f.meta && f.meta.home)
    return (home.length ? home : l).slice(0, 6)
  }), [])

  return (
    <>
      <div className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url(${img('img/hero.jpg')})` }} />
        <div className="container hero-content">
          <span className="eyebrow">Voting {shortDate(dates.votingStart)} &ndash; {shortDateYear(dates.votingEnd)}</span>
          <h1>The <span className="gold">ProFluencer</span> Awards 2026</h1>
          <p className="lead">10 industries. 50 golden trophies. Decided entirely by verified public vote &mdash; no juries, no politics. Nominate yourself, share your voting link, and let your audience carry you to the stage.</p>
          <div className="hero-ctas">
            <Link className="btn btn-gold" to="/nominate">Nominate Yourself</Link>
            <Link className="btn btn-ghost" to="/nominees">Vote for a Nominee</Link>
          </div>
          <Countdown kind="ceremony" />
        </div>
      </div>

      <div className="stats-band">
        <div className="stats-grid">
          <div className="stat"><b>{cats.length || 10}</b><span>Industry Categories</span></div>
          <div className="stat"><b>{(cats.length || 10) * 5}</b><span>Golden Trophies</span></div>
          <div className="stat"><b>1</b><span>Vote per Category</span></div>
          <div className="stat"><b>{shortDate(dates.ceremonyDate)}</b><span>Awards Afternoon</span></div>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="center">
            <span className="eyebrow">How it works</span>
            <h2 className="sec-title">From nomination to the stage<br />in four steps</h2>
          </div>
          <div className="steps">
            <div className="step"><div className="n">1</div><h3>Nominate yourself</h3><p>Create your profile in minutes and choose your industry category. Our team reviews every nomination for authenticity.</p></div>
            <div className="step"><div className="n">2</div><h3>Get your voting link</h3><p>Once approved, you receive a personal voting link with a QR code. Share it anywhere your audience lives.</p></div>
            <div className="step"><div className="n">3</div><h3>Fans vote &mdash; verified</h3><p>Each voter registers with name, email and phone and can vote for one nominee per category. Fair, transparent, one tap.</p></div>
            <div className="step"><div className="n">4</div><h3>Winners crowned {shortDate(dates.ceremonyDate)}</h3><p>The top 5 of each category are honoured live at the awards afternoon in {dates.ceremonyCity}. Rank 1 takes the category crown.</p></div>
          </div>
          <div className="center mt"><Link className="btn btn-ghost" to="/voting">Read the full voting rules</Link></div>
        </div>
      </section>

      <section style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="center">
            <span className="eyebrow">{cats.length || 10} categories &middot; {(cats.length || 10) * 5} awards</span>
            <h2 className="sec-title">Every industry gets its moment</h2>
            <p className="sec-sub">Each category honours its top 5 nominees &mdash; ranked purely by valid public votes. Rank 1 is crowned Category Winner.</p>
          </div>
          <div className="cat-grid">
            {cats.map((c) => (
              <Link className="cat-card" key={c.id} to={`/nominees?cat=${c.id}`}>
                <div className="ph"><img loading="lazy" src={assetUrl(c.img)} alt={c.name} /></div>
                <div className="ov" />
                <div className="info">
                  <span className="top5-badge">5 Awards</span>
                  <h3 style={{ marginTop: 10 }}>{c.name}</h3>
                  <p>{c.tagline}</p>
                  <div className="leader-line">
                    <span className="dot" />
                    <span><b>{counts ? counts[c.id] || 0 : 0}</b> approved nominees</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="center mt"><Link className="btn btn-ghost" to="/categories">All categories &amp; details</Link></div>
        </div>
      </section>

      <section style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="cer-grid" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 26, overflow: 'hidden' }}>
            <div className="cer-img" style={{ borderRadius: 0 }}><img src={img('img/trophy.jpg')} alt="The ProFluencer golden trophy" /></div>
            <div style={{ padding: '36px 32px' }}>
              <span className="eyebrow">The trophy</span>
              <h2 className="sec-title" style={{ fontSize: 'clamp(24px,4.5vw,36px)' }}>50 golden trophies.<br />Zero jury politics.</h2>
              <p className="sec-sub" style={{ marginTop: 12 }}>Every ProFluencer trophy is earned the hard way &mdash; one verified public vote at a time. Suspicious votes are reviewed and removed, and every result is frozen in a published snapshot before the ceremony.</p>
              <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link className="btn btn-gold" to="/nominate">Claim your shot</Link>
                <Link className="btn btn-ghost" to="/voting">How we keep voting fair</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ceremony">
        <div className="container">
          <div className="center">
            <span className="eyebrow" style={{ color: '#9c7a1e' }}>The big afternoon</span>
            <h2 className="sec-title">Awards afternoon &middot; {monthDay(dates.ceremonyDate)}</h2>
            <p className="sec-sub">Black tie, golden lights, and 50 winners walking the stage as their names light up the hall.</p>
          </div>
          <div className="cer-grid">
            <div className="cer-img"><img src={img('img/ceremony.jpg')} alt="ProFluencer Awards ceremony celebration" /></div>
            <div>
              <div className="cer-facts">
                <div className="cer-fact"><b>{weekdayDate(dates.ceremonyDate)}</b><span>Afternoon session &middot; {dates.ceremonyCity}</span></div>
                <div className="cer-fact"><b>{dates.ceremonyCity}, UAE</b><span>{dates.ceremonyVenue || 'Venue announced soon'}</span></div>
                <div className="cer-fact"><b>50 honourees</b><span>Top 5 of each industry</span></div>
                <div className="cer-fact"><b>Live audience</b><span>Fans, brands &amp; media</span></div>
              </div>
              <p style={{ marginTop: 20, color: '#5a5a5a', fontSize: 14.5 }}>Winners are announced live on stage and celebrated at the evening gala. Approved nominees receive ceremony invitations &mdash; RSVP from your dashboard or the event page.</p>
              <div style={{ marginTop: 18 }}><Link className="btn btn-gold" to="/event" style={{ background: '#141414', color: '#f5f1e8', boxShadow: 'none' }}>Ceremony details &amp; RSVP</Link></div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="center">
            <span className="eyebrow">Questions</span>
            <h2 className="sec-title">Everything you need to know</h2>
          </div>
          <div className="faq">
            {faqs.map((f) => <FaqItem key={f.id} q={f.title} a={f.body} />)}
          </div>
          <div className="center mt"><Link className="btn btn-gold" to="/nominate">Start your nomination</Link></div>
        </div>
      </section>
    </>
  )
}
