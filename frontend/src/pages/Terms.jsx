import { PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

const SECTIONS = [
  { t: '1. Eligibility', b: 'Nominees must be 18 years or older and nominate only their own genuine public creator profile. Profiles must be publicly accessible for the duration of the edition. One nomination per influencer per edition; the organiser may reassign categories before voting opens.' },
  { t: '2. Voting', b: 'Voting opens October 15, 2026 and closes November 30, 2026. Each voter registers once with name, email and mobile number, verifies via an email code, and may cast one vote per category — up to 10 votes per edition. The same email address or phone number cannot vote twice in the same category. Votes are irrevocable once cast.' },
  { t: '3. Fair play', b: 'Fraudulent, automated, purchased or otherwise abusive votes are invalidated and excluded from totals. Nominees may campaign publicly but must not misrepresent their rank, impersonate the organisers, or offer incentives tied to votes. Organisers never edit totals by hand; counts derive solely from valid vote records.' },
  { t: '4. Results', b: 'Each category honours its top 5 by valid votes: rank 1 is the Category Winner, ranks 2–5 are Top 5 Honourees. Ties are broken by earliest last vote, then earliest approval. Live counts during voting are provisional; final results are frozen in a published snapshot and announced at the ceremony on December 11, 2026.' },
  { t: '5. Ceremony', b: 'The awards afternoon takes place in Dubai on December 11, 2026. Attendance is by invitation; RSVPs are reviewed by the events team. Organisers may adjust event details and will notify invited guests.' },
  { t: '6. Conduct & disqualification', b: 'The organiser may request corrections to a nomination, or disqualify entries that breach these terms. Decisions on eligibility, vote validity and results are final.' },
  { t: '7. Liability', b: 'The platform is provided as-is. The organiser is not liable for indirect losses arising from participation. Nothing here limits rights that cannot be limited by law.' },
  { t: '8. Changes', b: 'Material changes to the voting window or rules during the edition require dual organiser approval and are announced on this site with a new terms version.' },
]

export default function Terms() {
  const { data: settings } = useAsync(() => Store.settings(), [])
  return (
    <>
      <PageHero
        eyebrow={<>Terms &middot; {settings ? settings.termsVersion : ''}</>}
        title="Terms & voting rules"
        sub="Last updated: September 2026. By nominating, voting or attending, you accept these terms."
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
