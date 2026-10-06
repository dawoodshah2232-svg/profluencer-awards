import { PageHero } from '../components/ui'

const SECTIONS = [
  { t: 'What we collect', b: 'Nominees: legal name (private), display name, contact details, location, category, profile links, bio, photo and login credentials. Voters: name, email and phone used to verify one vote per category — voter identities are never shared with nominees. RSVP & enquiries: name, email and message content.' },
  { t: 'How we use it', b: 'To run the awards: review nominations, verify votes, prevent fraud, publish approved nominee profiles and results, manage the ceremony, and reply to messages. Marketing messages are sent only with your explicit consent.' },
  { t: 'What we never do', b: 'We never sell personal data. Voter identities are never disclosed to nominees or third parties. Legal names of nominees stay internal.' },
  { t: 'Retention & your rights', b: 'Records are kept as long as needed to run and audit the edition. You can request a copy, correction or deletion of your data — contact us and we will respond within 30 days.' },
  { t: 'Security', b: 'Production systems use encrypted storage, server-side sessions, multi-factor admin access and audit logging. Demo builds store data only in your own browser.' },
]

export default function Privacy() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="Privacy policy"
        sub="Last updated: September 2026. Short version: we collect only what the awards need, and we never sell your data."
      />
      <section style={{ paddingTop: 10 }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="form-card">
            {SECTIONS.map((s, i) => (
              <div key={s.t} style={{ marginBottom: i === SECTIONS.length - 1 ? 0 : 20 }}>
                <h3 style={{ marginBottom: 10, fontSize: 16 }}>{s.t}</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14.5 }}>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
