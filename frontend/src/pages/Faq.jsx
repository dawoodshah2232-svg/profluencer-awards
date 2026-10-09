import { Link } from 'react-router-dom'
import { FaqItem, PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

export default function Faq() {
  const { data: faqs = [], loading, error } = useAsync(() => Store.content('faq'), [])

  return (
    <>
      <PageHero
        eyebrow="Help center"
        title="Frequently asked questions"
        sub="Everything about nominations, voting, the ceremony and results."
      />
      <section style={{ paddingTop: 10 }}>
        <div className="container" style={{ maxWidth: 800 }}>
          {loading && <p className="hint">Loading questions…</p>}
          {error && <p className="hint">Could not load the FAQ right now. Please try again shortly.</p>}
          <div className="faq">
            {faqs.map((f) => <FaqItem key={f.id} q={f.title} a={f.body} />)}
          </div>
          <div className="center mt" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-gold" to="/nominate">Start your nomination</Link>
            <Link className="btn btn-ghost" to="/contact">Ask us anything</Link>
          </div>
        </div>
      </section>
    </>
  )
}
