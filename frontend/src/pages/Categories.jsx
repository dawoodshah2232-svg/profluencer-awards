import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Countdown from '../components/Countdown'
import { PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

import { assetUrl } from '../lib/assets'

export default function Categories() {
  const loc = useLocation()
  const { data: cats = [] } = useAsync(() => Store.categories(), [])
  const { data: counts } = useAsync(async () => {
    const list = await Store.categories()
    const out = {}
    for (const c of list) out[c.id] = await Store.approvedCount(c.id)
    return out
  }, [])

  useEffect(() => {
    if (loc.hash) {
      const t = document.querySelector(loc.hash)
      if (t) setTimeout(() => t.scrollIntoView({ behavior: 'smooth' }), 400)
    }
  }, [loc.hash, cats.length])

  return (
    <>
      <PageHero
        eyebrow="Official categories"
        title={<>10 industries.<br />50 trophies.</>}
        sub="Each category honours its top 5 nominees by valid public vote. Rank 1 is crowned Category Winner; ranks 2–5 are Top 5 Honourees. Rankings stay private to nominees until the ceremony — browse the directory to meet the contenders."
      >
        <Countdown className="" />
      </PageHero>

      <section style={{ paddingTop: 10 }}>
        <div className="container">
          {cats.map((c, i) => (
            <div key={c.id} id={c.id} style={{ marginBottom: 22, scrollMarginTop: 90 }}>
              <Link className="cat-card" to={`/nominees?cat=${c.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr', marginBottom: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 0, alignItems: 'stretch' }}>
                  <div style={{ minHeight: 130 }}>
                    <img loading="lazy" src={assetUrl(c.img)} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: 20 }}>
                    <span className="top5-badge">5 Awards</span>
                    <h3 style={{ margin: '10px 0 6px', fontSize: 19 }}>{String(i + 1).padStart(2, '0')} &middot; {c.name}</h3>
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 10px' }}>{c.desc}</p>
                    <span style={{ fontSize: 13, color: 'var(--gold-lt)', fontWeight: 700 }}>
                      {counts ? counts[c.id] || 0 : 0} approved nominees — view them &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="container center">
          <h2 className="sec-title" style={{ fontSize: 'clamp(24px,4.5vw,36px)' }}>Your industry. Your trophy.</h2>
          <p className="sec-sub" style={{ margin: '0 auto 24px' }}>Not listed yet? Nominate yourself in minutes and start collecting verified votes.</p>
          <Link className="btn btn-gold" to="/nominate">Nominate Yourself</Link>
        </div>
      </section>
    </>
  )
}
