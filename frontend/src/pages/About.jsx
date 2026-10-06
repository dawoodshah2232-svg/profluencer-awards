import { Link } from 'react-router-dom'
import { PageHero } from '../components/ui'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About the awards"
        title="The people's choice, made official"
        sub="ProFluencer Awards exists for one reason: the creators who move culture deserve a stage as big as their impact — and the audience, not a jury, should decide who stands on it."
      />
      <section style={{ paddingTop: 10 }}>
        <div className="container">
          <div className="cer-grid">
            <div className="cer-img"><img src={img('img/trophy.jpg')} alt="The ProFluencer golden trophy" /></div>
            <div>
              <h2 className="sec-title" style={{ fontSize: 'clamp(24px,4.5vw,36px)' }}>10 industries. 50 trophies. Zero jury politics.</h2>
              <p className="sec-sub" style={{ marginTop: 12 }}>
                Every edition honours the top 5 creators in each of 10 industry categories — ranked purely by verified public votes.
                Rank 1 in each category is crowned Category Winner; ranks 2–5 are celebrated as Top 5 Honourees.
              </p>
              <p className="sec-sub" style={{ marginTop: 12 }}>
                Voters register once with their name, email and phone, verify by email code, and can back one nominee per category.
                Suspicious votes are reviewed and removed, and every result is frozen in a published snapshot before the ceremony.
              </p>
            </div>
          </div>

          <div className="steps" style={{ marginTop: 48 }}>
            <div className="step"><div className="n">10</div><h3>Industry categories</h3><p>From Fashion and Beauty to Finance, Trading and Crypto — every major creator vertical gets its moment.</p></div>
            <div className="step"><div className="n">50</div><h3>Golden trophies</h3><p>Five honourees per category, crowned live at the awards afternoon in Dubai on December 11, 2026.</p></div>
            <div className="step"><div className="n">1</div><h3>Vote per category</h3><p>One verified voter, one vote per category — up to 10 votes total. Email-verified and fraud-reviewed.</p></div>
            <div className="step"><div className="n">0</div><h3>Jury politics</h3><p>No panels, no backrooms. The audience decides, the snapshot freezes it, the stage announces it.</p></div>
          </div>

          <div className="cta-band">
            <span className="eyebrow">Join the edition</span>
            <h3>Your audience can put you on that stage.</h3>
            <p>Nomination is free and takes minutes. Voting runs 15 October – 30 November 2026.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn btn-gold" to="/nominate">Nominate Yourself</Link>
              <Link className="btn btn-ghost" to="/voting">How voting works</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
