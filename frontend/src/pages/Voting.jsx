import { Link } from 'react-router-dom'
import { PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

const RULES = [
  { t: '1. Who can vote', b: <>Anyone. Each voter registers once with their <b style={{ color: 'var(--text)' }}>name, email and mobile number</b> — your email and phone are your voter ID. The same email address or phone number cannot be used to vote twice in the same category. Duplicate, automated or purchased votes are detected and removed.</> },
  { t: '2. One vote per category', b: <>A verified voter can vote for <b style={{ color: 'var(--text)' }}>one nominee in each of the 10 categories</b> — up to 10 votes total across the edition. Votes are irrevocable: once cast, a vote cannot be changed or moved.</> },
  { t: '3. Email verification', b: <>After you submit your details, your vote is <b style={{ color: 'var(--text)' }}>held</b> and a verification code is sent to your email. The vote only counts once you enter the code. Unverified votes never count.</> },
  { t: '4. The voting window', b: <>Voting opens <b style={{ color: 'var(--text)' }}>October 15, 2026</b> and closes <b style={{ color: 'var(--text)' }}>November 30, 2026</b>. Votes cast outside the window do not count. The countdown on this site follows the official window.</> },
  { t: '5. Fairness controls', b: <>All votes pass automated and manual review. Votes found to be fraudulent, automated, purchased or otherwise in breach of these rules are marked invalid and excluded from totals. Organisers never edit vote counts by hand — counts are derived only from valid vote records.</> },
  { t: '6. How winners are decided', b: <>In each category, nominees are ranked by valid votes. The <b style={{ color: 'var(--text)' }}>top 5</b> receive awards: rank 1 is crowned Category Winner, ranks 2–5 are Top 5 Honourees. 50 trophies in total.</> },
  { t: '7. Tie-break rule', b: <>If two nominees finish with equal valid votes, the tie is broken by (a) whoever reached the final total first, then (b) earlier nomination approval time, then (c) internal record order. The rule is published before voting begins and applied identically to every category.</> },
  { t: '8. Provisional results', b: <>Live counts shown to nominees during the voting window are <b style={{ color: 'var(--text)' }}>provisional</b> and subject to vote verification. Final results are frozen in a published snapshot, announced at the ceremony on December 11, 2026, then published on this site.</> },
  { t: '9. Eligibility of nominees', b: <>Nominees must be 18 or older, submit their own genuine public creator profile, and keep their profile public for the duration of the edition. Breaches may lead to disqualification.</> },
]

export default function Voting() {
  const { data: settings } = useAsync(() => Store.settings(), [])
  return (
    <>
      <PageHero
        eyebrow={<>Official rules &middot; {settings ? settings.termsVersion : ''}</>}
        title="How voting works"
        sub="The ProFluencer Awards are decided entirely by verified public vote. These rules keep every category fair."
      />
      <section style={{ paddingTop: 10 }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="form-card">
            {RULES.map((r) => (
              <div key={r.t} style={{ marginBottom: 22 }}>
                <h3 style={{ marginBottom: 14, fontSize: 17 }}>{r.t}</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14.5 }}>{r.b}</p>
              </div>
            ))}
            <div className="center" style={{ marginTop: 28 }}>
              <Link className="btn btn-gold" to="/nominees">Meet the nominees &amp; vote</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
