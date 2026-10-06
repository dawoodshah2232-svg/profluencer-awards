import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Countdown from '../components/Countdown'
import { Avatar, Chip, Field, PageHero } from '../components/ui'
import { useAsync, useCopy } from '../lib/hooks'
import { Store, getMode } from '../lib/store'
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

function ShareRow({ name, link }) {
  const toast = useToast()
  const [, copy] = useCopy()
  const msg = encodeURIComponent(`Vote for ${name} at the ProFluencer Awards 2026: ${link}`)
  return (
    <div className="share-row" style={{ justifyContent: 'center', marginTop: 22 }}>
      <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${msg}`}>Share on WhatsApp</a>
      <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${msg}`}>Share on X</a>
      <button className="share-btn" type="button" onClick={() => copy(link, () => toast('Voting link copied'))}>Copy link</button>
    </div>
  )
}

function VoteForm({ nominee, onDone }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [otpStep, setOtpStep] = useState(null) // { holdId }
  const [otp, setOtp] = useState('')
  const [otpErr, setOtpErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const v = validateVoter({ name, email, phone })
    if (!v.ok) { setErrors(v.errors); return }
    setErrors({})
    if (rateLimited()) {
      setErrors({ form: 'Please wait a few minutes before voting again.' })
      return
    }
    setSubmitting(true)
    try {
      const r = await Store.registerAndVote(nominee.id, { name: v.name, email: v.email, phone: v.phone })
      if (r.ok && r.otp_required) {
        // Production flow: vote is HELD, email OTP sent — it only counts after verification.
        setOtpStep({ holdId: r.hold_id })
        toast('Verification code sent to your email')
      } else if (r.ok) {
        toast(`Vote counted for ${nominee.name}`)
        onDone('counted')
      } else if (r.code === 'ALREADY_VOTED') {
        onDone('already')
      } else {
        setErrors({ form: errMsg(r.code) })
      }
    } catch {
      setErrors({ form: 'Could not submit your vote. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const verify = async (e) => {
    e.preventDefault()
    setOtpErr('')
    if (!otp.trim()) { setOtpErr('Enter the code from your email.'); return }
    setSubmitting(true)
    try {
      const r = await Store.verifyVoteOtp(otpStep.holdId, otp.trim())
      if (r && r.ok) {
        toast(`Vote counted for ${nominee.name}`)
        onDone('counted')
      } else {
        setOtpErr(errMsg((r && r.code) || 'OTP_INVALID'))
      }
    } catch {
      setOtpErr('Could not verify the code. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    try {
      await Store.resendVoteOtp(otpStep.holdId)
      toast('A new code was sent to your email')
    } catch { toast('Could not resend the code') }
  }

  if (otpStep) {
    return (
      <div className="otp-box">
        <b>Check your email</b>
        <p className="hint" style={{ marginTop: 6 }}>
          We sent a verification code to <b style={{ color: 'var(--text)' }}>{email}</b>. Your vote is held and will only count after you enter the code. Unverified votes never count.
        </p>
        <form onSubmit={verify}>
          <Field label="Verification code">
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" />
          </Field>
          {otpErr && <p className="hint" style={{ color: '#fca5a5', margin: '10px 0' }}>{otpErr}</p>}
          <button className="btn btn-gold btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify and count my vote'}
          </button>
        </form>
        <p className="hint center" style={{ marginTop: 12 }}>
          Didn&rsquo;t get it? <button type="button" className="mini-btn" onClick={resend}>Resend code</button>
        </p>
      </div>
    )
  }

  return (
    <div className="otp-box">
      <b>Vote for {nominee.name.split(' ')[0]}</b>
      <p className="hint">Enter your details below — one person, one vote per category. Your email and phone are your voter ID: neither can be reused in this category.</p>
      <form onSubmit={submit} noValidate>
        <Field label="Full name *">
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" />
          {errors.name && <div className="hint" style={{ color: '#fca5a5' }}>{errors.name}</div>}
        </Field>
        <div className="form-2col">
          <Field label="Email *" noMargin>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@email.com" />
            {errors.email && <div className="hint" style={{ color: '#fca5a5' }}>{errors.email}</div>}
          </Field>
          <Field label="Phone *" noMargin>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="+971 5X XXX XXXX" />
            {errors.phone && <div className="hint" style={{ color: '#fca5a5' }}>{errors.phone}</div>}
          </Field>
        </div>
        {/* honeypot */}
        <input type="text" name="website" autoComplete="off" tabIndex="-1" aria-hidden="true"
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          onChange={() => {}} />
        {errors.form && <p className="hint" style={{ color: '#fca5a5', marginTop: 10 }}>{errors.form}</p>}
        <button className="btn btn-gold btn-block big-vote" type="submit" disabled={submitting} style={{ marginTop: 14 }}>
          {submitting ? 'Submitting…' : 'Submit my vote'}
        </button>
      </form>
      {getMode() === 'demo' && (
        <p className="hint" style={{ marginTop: 10 }}>Demo preview: votes are stored in this browser only and counted instantly. Production verifies every vote with an email code first.</p>
      )}
    </div>
  )
}

export default function NomineeDetail() {
  const { id } = useParams()
  const [done, setDone] = useState(null) // 'counted' | 'already'
  const { data: nominee, loading } = useAsync(() => Store.getNominee(id), [id])
  const { data: cat } = useAsync(() => (nominee ? Store.category(nominee.categoryId) : null), [nominee && nominee.id])
  const { data: state } = useAsync(() => Store.votingState(), [])
  const { data: settings } = useAsync(() => Store.settings(), [])
  const { data: choice, reload: reloadChoice } = useAsync(
    () => (nominee ? Store.voterChoice(nominee.categoryId) : null),
    [nominee && nominee.id]
  )

  if (loading) return <PageHero title="Loading…" />
  if (!nominee || nominee.status !== 'approved') {
    return (
      <PageHero title="Profile not available" sub="This nominee link is invalid or the profile is no longer published.">
        <div style={{ marginTop: 22 }}><Link className="btn btn-gold" to="/nominees">Browse nominees</Link></div>
      </PageHero>
    )
  }

  const link = typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''
  const first = nominee.name.split(' ')[0]

  let action = null
  if (state === 'upcoming') {
    action = (
      <>
        <div className="state-note"><b style={{ color: 'var(--text)' }}>Voting opens October 15, 2026.</b><br />Share this page and come back when the voting window opens.</div>
        <Countdown showNote={false} className="" />
      </>
    )
  } else if (state === 'closed') {
    action = (
      <div className="state-note"><b style={{ color: 'var(--text)' }}>Voting closed — results under review.</b><br />
        {settings && settings.resultsPublished
          ? <>Winners have been announced. <Link to="/winners" style={{ color: 'var(--gold-lt)', fontWeight: 700 }}>See the results</Link>.</>
          : 'Winners will be crowned at the ceremony on December 11, 2026.'}
      </div>
    )
  } else if (done === 'counted' || choice === nominee.id) {
    action = (
      <>
        <div className="voted-note">Your vote for {nominee.name} is counted. Thank you.</div>
        <p className="hint" style={{ marginTop: 10 }}>You can still vote for one nominee in each of the other 9 categories.</p>
      </>
    )
  } else if (done === 'already' || choice) {
    action = (
      <div className="state-note"><b style={{ color: 'var(--text)' }}>You already voted in {cat ? cat.name : 'this category'}</b><br />One vote per category; votes cannot be changed.</div>
    )
  } else {
    action = <VoteForm nominee={nominee} onDone={(r) => { setDone(r); reloadChoice() }} />
  }

  return (
    <>
      <PageHero>
        <div className="vote-hero">
          <Avatar name={nominee.name} photo={nominee.photo} size={110} style={{ margin: '0 auto 18px', border: '3px solid var(--gold)' }} />
          <Chip>{cat ? cat.name : ''}</Chip>
          <h1 style={{ marginTop: 12, fontSize: 'clamp(28px,6vw,44px)' }}>{nominee.name}</h1>
          <p className="sec-sub" style={{ margin: '10px auto 0' }}>
            {nominee.handle} &middot; {nominee.platform}
            {nominee.followers ? ` · ${nominee.followers} followers` : ''}
            {nominee.bio ? ` — ${nominee.bio}` : ''}
          </p>
          <div style={{ marginTop: 8 }}>{action}</div>
          <ShareRow name={first} link={link} />
        </div>
        <div className="center mt">
          <p className="sec-sub" style={{ margin: '0 auto 18px' }}>Know a creator who deserves a trophy? Nominations are free.</p>
          <Link className="btn btn-ghost" to="/nominate">Nominate an influencer</Link>
        </div>
      </PageHero>
    </>
  )
}
