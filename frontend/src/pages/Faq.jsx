import { Link } from 'react-router-dom'
import { FaqItem, PageHero } from '../components/ui'

const FAQS = [
  { q: 'Who can be nominated?', a: 'Individual creators aged 18 or above with at least one publicly accessible, active content profile. You nominate yourself by signing up and selecting one industry category.' },
  { q: 'How does voting work?', a: 'Open a nominee\u2019s voting link, enter your name, email and phone, and submit. Your vote is held until you verify it with the code sent to your email. You can vote for one nominee in each of the 10 categories — up to 10 votes total. The same email or phone number cannot vote twice in one category, and votes cannot be changed once cast.' },
  { q: 'When is the voting window?', a: 'Voting opens October 15, 2026 and closes November 30, 2026. Winners are crowned at the awards afternoon on December 11, 2026 in Dubai.' },
  { q: 'What happens in a tie?', a: 'Tied nominees are ordered by who reached the final vote total first, then by earlier approval time. The rule is published before voting begins and applied identically to everyone.' },
  { q: 'Is nomination free?', a: 'Yes. Nomination and voting are completely free. Every approved nominee receives a voting link, a live dashboard and ceremony invitations.' },
  { q: 'How do nominees campaign?', a: 'Approved nominees get a personal voting link, a QR code and a campaign toolkit in their dashboard with ready-made messages for WhatsApp, Instagram and TikTok.' },
  { q: 'How are fake votes handled?', a: 'All votes pass automated and manual review. Duplicate, automated or purchased votes are detected, invalidated and excluded from totals. Organisers never edit vote counts by hand.' },
  { q: 'When are results announced?', a: 'Final results are frozen in a published snapshot after verification and announced live on stage at the ceremony on December 11, 2026, then published on the Winners page.' },
  { q: 'Where is the ceremony?', a: 'Dubai, UAE — the exact venue will be announced soon. The awards afternoon is followed by an evening gala.' },
  { q: 'How do I attend as a guest?', a: 'Reserve your seat from the Event page. RSVPs are reviewed by the events team and confirmed guests receive their invitation by email.' },
]

export default function Faq() {
  return (
    <>
      <PageHero
        eyebrow="Help center"
        title="Frequently asked questions"
        sub="Everything about nominations, voting, the ceremony and results."
      />
      <section style={{ paddingTop: 10 }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="faq">
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
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
