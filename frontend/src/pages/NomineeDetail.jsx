import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Countdown from '../components/Countdown'
import Icon from '../components/Icons'
import { Avatar, Chip, Field, PageHero } from '../components/ui'
import { useAsync, useCopy } from '../lib/hooks'
import { Store, getMode } from '../lib/store'
import { assetUrl } from '../lib/assets'
import { longDate, useDates } from '../lib/dates'
import { validateVoter, VOTE_ERRORS } from '../lib/voting'
import { useToast } from '../components/Layout'

const errMsg = (code) => VOTE_ERRORS[code] || 'Could not submit your vote. Try again.'

/* Simple client-side rate limit: max 10 vote attempts per 10 minutes. */
function rateLimited() {
  const key = 'pfa_vote_spam'
  const nowT = Date.now()
  try {
    const log = JSON.parse(localStorage.getItem(key) || '[]').filter((t) => nowT - t < 10 * 60 * 1000)
    if (log.length >= 10) return true
    log.push(nowT)
    localStorage.setItem(key, JSON.stringify(log))
  } catch { /* ignore */ }
  return false
}

function Steps({ step }) {
  const s = (n, label) => (
    <div className={`vt-step${step === n ? ' on' : ''}${step > n ? ' done' : ''}`}>
      <i>{step > n ? <Icon name="check" size={14} strokeWidth={2.4} /> : n}</i>{label}
    </div>
  )
  return <div className="vt-steps">{s(1, 'Your details')}<span className="vt-line" />{s(2, 'Verify email')}<span className="vt-line" />{s(3, 'Counted')}</div>
}

/* Six single-digit boxes; typing advances, Backspace goes back, paste fills all. */
function OtpInput({ value, onChange }) {
  const refs = useRef([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')
  const setAt = (i, d) => {
    const next = digits.slice()
    next[i] = d
    onChange(next.join('').slice(0, 6))
  }
  return (
    <div className="vt-otp" onPaste={(e) => {
      const p = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
      if (p) { e.preventDefault(); onChange(p); refs.current[Math.min(5, p.length)]?.focus() }
    }}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el }} value={d} inputMode="numeric" maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1)
            setAt(i, v)
            if (v && i < 5) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus() }} />
      ))}
    </div>
  )
}

function Trust() {
  return (
    <div className="vt-trust">
      <div><Icon name="shield" size={20} />Email-verified vote</div>
      <div><Icon name="badge" size={20} />One vote per category</div>
      <div><Icon name="eye" size={20} />Fraud-checked before results</div>
    </div>
  )
}

function VotePanel({ nominee, catName, onDone }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [otpStep, setOtpStep] = useState(null) // { holdId }
  const [otp, setOtp] = useState('')
  const [otpErr, setOtpErr] = useState('')
  const first = nominee.name.split(' ')[0]

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const v = validateVoter({ name, email, phone })
    if (!v.ok) { setErrors(v.errors); return }
    setErrors({})
    if (rateLimited()) { setErrors({ form: 'Please wait a few minutes before voting again.' }); return }
    setSubmitting(true)
    try {
      const r = await Store.registerAndVote(nominee.id, { name: v.name, email: v.email, phone: v.phone })
      if (r.ok && r.otp_required) {
        // Production flow: the vote is HELD until the emailed code is entered.
        setOtpStep({ holdId: r.hold_id })
        toast('Verification code sent to your email')
      } else if (r.ok) {
        onDone('counted')
      } else if (r.code === 'ALREADY_VOTED') {
        onDone('already')
      } else {
        setErrors({ form: errMsg(r.code) })
      }
    } catch {
      setErrors({ form: 'Could not submit your vote. Try again.' })
    } finally { setSubmitting(false) }
  }

  const verify = async (e) => {
    e.preventDefault()
    setOtpErr('')
    if (otp.length !== 6) { setOtpErr('Enter the 6-digit code from your email.'); return }
    setSubmitting(true)
    try {
      const r = await Store.verifyVoteOtp(otpStep.holdId, otp)
      if (r && r.ok) onDone('counted')
      else setOtpErr(errMsg((r && r.code) || 'OTP_INVALID'))
    } catch { setOtpErr('Could not verify the code. Try again.') } finally { setSubmitting(false) }
  }

  const resend = async () => {
    try { await Store.resendVoteOtp(otpStep.holdId); toast('A new code was sent to your email') } catch { toast('Please wait a moment before requesting a new code') }
  }

  if (otpStep) {
    return (
      <>
        <Steps step={2} />
        <h2>Check your email</h2>
        <p className="lead">We sent a 6-digit code to <b style={{ color: 'var(--text)' }}>{email}</b>. Your vote for {first} is on hold and only counts once you enter it. The code expires in 10 minutes.</p>
        <form onSubmit={verify}>
          <OtpInput value={otp} onChange={setOtp} />
          {otpErr && <p className="vt-err" style={{ textAlign: 'center', marginBottom: 10 }}>{otpErr}</p>}
          <button className="btn btn-gold btn-block" type="submit" disabled={submitting}>{submitting ? 'Verifying…' : 'Verify & count my vote'}</button>
        </form>
        <p className="hint center" style={{ marginTop: 14 }}>
          No email? Check spam, or <button type="button" className="mini-btn" onClick={resend}>Resend code</button>
        </p>
        <Trust />
      </>
    )
  }

  return (
    <>
      <Steps step={1} />
      <h2>Vote for {first}</h2>
      <p className="lead">{catName ? `${catName} · ` : ''}One person, one vote per category. Your email and phone are your voter ID and are never shown publicly.</p>
      <form onSubmit={submit} noValidate>
        <Field label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" />
          {errors.name && <div className="vt-err">{errors.name}</div>}
        </Field>
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@email.com" />
          {errors.email && <div className="vt-err">{errors.email}</div>}
        </Field>
        <Field label="Mobile number">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="+971 5X XXX XXXX" />
          {errors.phone && <div className="vt-err">{errors.phone}</div>}
        </Field>
        {/* honeypot */}
        <input type="text" name="website" autoComplete="off" tabIndex="-1" aria-hidden="true"
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} onChange={() => {}} />
        {errors.form && <p className="vt-err" style={{ marginBottom: 10 }}>{errors.form}</p>}
        <button className="btn btn-gold btn-block big-vote" type="submit" disabled={submitting}>
          {submitting ? 'Sending code…' : `Vote for ${first}`}
        </button>
      </form>
      {getMode() === 'demo' && <p className="hint" style={{ marginTop: 10 }}>Demo preview: votes are stored in this browser only and counted instantly.</p>}
      <Trust />
    </>
  )
}

export default function NomineeDetail() {
  const { id } = useParams()
  const toast = useToast()
  const dates = useDates()
  const [, copy] = useCopy()
  const [done, setDone] = useState(null) // 'counted' | 'already'
  const { data: nominee, loading, reload } = useAsync(() => Store.getNominee(id), [id])
  const { data: cat } = useAsync(() => (nominee ? Store.category(nominee.categoryId) : null), [nominee && nominee.id])
  const { data: state } = useAsync(() => Store.votingState(), [])
  const { data: settings } = useAsync(() => Store.settings(), [])
  const { data: board } = useAsync(() => (nominee && (state === 'open' || (settings && settings.resultsPublished))
    ? Store.byCategory(nominee.categoryId, true) : null), [nominee && nominee.id, state, settings && settings.resultsPublished])
  const { data: choice, reload: reloadChoice } = useAsync(() => (nominee ? Store.voterChoice(nominee.categoryId) : null), [nominee && nominee.id])

  if (loading) return <PageHero title="Loading…" />
  if (!nominee || nominee.status !== 'approved') {
    return (
      <PageHero title="Profile not available" sub="This nominee link is invalid or the profile is no longer published.">
        <div style={{ marginTop: 22 }}><Link className="btn btn-gold" to="/nominees">Browse nominees</Link></div>
      </PageHero>
    )
  }

  const link = typeof window !== 'undefined' ? window.location.href : ''
  const first = nominee.name.split(' ')[0]
  const msg = encodeURIComponent(`Vote for ${nominee.name} at the ProFluencer Awards 2026: ${link}`)
  const visible = !!board
  const sorted = (board || []).slice().sort((a, b) => (b.votes || 0) - (a.votes || 0))
  const rank = sorted.findIndex((x) => x.id === nominee.id) + 1
  const total = sorted.reduce((a, x) => a + (x.votes || 0), 0)
  const share = total > 0 ? ((nominee.votes || 0) / total) * 100 : 0

  let panel
  if (state === 'upcoming') {
    panel = (
      <>
        <h2>Voting opens {longDate(dates.votingStart)}</h2>
        <p className="lead">Save this page and come back when the window opens. Share it with {first}&rsquo;s fans now.</p>
        <Countdown kind="voting" />
        <Trust />
      </>
    )
  } else if (state === 'closed') {
    panel = (
      <>
        <h2>Voting has closed</h2>
        <p className="lead">{settings && settings.resultsPublished
          ? <>The results are published. <Link to="/winners" style={{ color: 'var(--gold-lt)', fontWeight: 700 }}>See the winners</Link>.</>
          : `Votes are being verified. Winners are crowned on ${longDate(dates.ceremonyDate)} in ${dates.ceremonyCity}.`}</p>
        <Link className="btn btn-ghost btn-block" to="/leaderboard">View the leaderboard</Link>
      </>
    )
  } else if (done === 'counted' || choice === nominee.id) {
    panel = (
      <div className="vt-done">
        <Steps step={4} />
        <div className="ring"><Icon name="check" size={40} strokeWidth={2.2} /></div>
        <h2>Your vote is counted</h2>
        <p className="lead">Thank you for voting for {nominee.name}. You can vote once in each of the other categories too.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-gold" to="/nominees">Vote in another category</Link>
          <Link className="btn btn-ghost" to="/leaderboard">Live leaderboard</Link>
        </div>
      </div>
    )
  } else if (done === 'already' || choice) {
    panel = (
      <>
        <h2>You already voted in {cat ? cat.name : 'this category'}</h2>
        <p className="lead">Each person gets one vote per category, and votes cannot be changed. You can still vote in the other categories.</p>
        <Link className="btn btn-gold btn-block" to="/nominees">Browse other categories</Link>
      </>
    )
  } else {
    panel = <VotePanel nominee={nominee} catName={cat && cat.name} onDone={(r) => { setDone(r); reloadChoice(); reload() }} />
  }

  return (
    <PageHero>
      <div className="vt">
        <div className="vt-card vt-profile">
          <Chip>{cat ? cat.name : 'Nominee'}</Chip>
          <Avatar name={nominee.name} photo={assetUrl(nominee.photo)} size={128} />
          <h1>{nominee.name}</h1>
          <div className="vt-handle">{[nominee.handle, nominee.platform, nominee.followers ? `${nominee.followers} followers` : ''].filter(Boolean).join(' · ')}</div>
          <span className="vt-verified"><Icon name="shield" size={14} />Verified nominee</span>
          {nominee.bio && <p className="vt-bio">{nominee.bio}</p>}
          {visible && (
            <div className="vt-stats">
              <div><b>{Store.fmt(nominee.votes || 0)}</b><span>Votes</span></div>
              <div><b>{rank > 0 ? `#${rank}` : '–'}</b><span>Rank</span></div>
              <div><b>{share.toFixed(1)}%</b><span>Share</span></div>
            </div>
          )}
          <div className="share-row" style={{ justifyContent: 'center', marginTop: 22 }}>
            <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${msg}`}>WhatsApp</a>
            <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${msg}`}>X</a>
            <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${msg}`}>Telegram</a>
            <button className="share-btn" type="button" onClick={() => copy(link, () => toast('Voting link copied'))}><Icon name="link" size={16} />Copy link</button>
          </div>
          {nominee.profile_url && <p style={{ marginTop: 14 }}><a className="hint" href={nominee.profile_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>View {first}&rsquo;s {nominee.platform || 'profile'}</a></p>}
        </div>
        <div className="vt-card vt-panel">{panel}</div>
      </div>
    </PageHero>
  )
}
