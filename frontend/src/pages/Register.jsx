import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout, { OrDivider, PasswordInput } from '../components/AuthLayout'
import GoogleButton, { useGoogleEnabled } from '../components/GoogleButton'
import { Field } from '../components/ui'
import { errorText } from '../components/AdminUI'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Snapchat', 'X', 'Facebook', 'LinkedIn', 'Twitch']
const EMPTY = {
  legalName: '', email: '', password: '',
  displayName: '', categoryId: '', platform: '', handle: '', profileUrl: '', followers: '',
  mobile: '', country: '', city: '', bio: '',
}

/* Influencer registration = self-nomination. Step 1 creates the login
   (email + password, or Google); step 2 is the nominee profile the awards
   team verifies before it goes public. */
export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const googleOn = useGoogleEnabled()
  const [google, setGoogle] = useState(() => (location.state && location.state.google) || null)
  const [step, setStep] = useState(google ? 2 : 1)
  const [f, setF] = useState(() => ({ ...EMPTY, legalName: (google && google.name) || '', displayName: (google && google.name) || '' }))
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: cats = [] } = useAsync(() => Store.categories(), [])
  const { data: existing } = useAsync(() => Store.session(), [])

  useEffect(() => {
    if (existing) navigate('/dashboard', { replace: true })
  }, [existing, navigate])

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const next = (e) => {
    e.preventDefault()
    setError('')
    if (f.legalName.trim().length < 2) { setError('Enter your full name.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) { setError('Enter a valid email address.'); return }
    if (f.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setF((x) => ({ ...x, displayName: x.displayName || x.legalName }))
    setStep(2)
  }

  const onGoogle = async (credential) => {
    setError('')
    // An existing account signs straight in; a new one continues to the profile step.
    try {
      const r = await Store.googleAuth(credential, 'login')
      if (r.ok) { navigate('/dashboard'); return }
      if (r.code === 'GOOGLE_NO_ACCOUNT') {
        setGoogle({ credential, name: r.name, email: r.email })
        setF((x) => ({ ...x, legalName: x.legalName || r.name || '', displayName: x.displayName || r.name || '' }))
        setStep(2)
        return
      }
      setError(r.message || 'Google sign-in failed. Try again.')
    } catch { setError('Google sign-in failed. Try again.') }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const d = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v).trim()]))
    if (d.displayName.length < 2) { setError('Enter your public display name.'); return }
    if (!d.categoryId) { setError('Choose your award category.'); return }
    if (!d.platform || !d.handle) { setError('Add your main platform and handle.'); return }
    if (!/^https?:\/\/\S+\.\S+/.test(d.profileUrl)) { setError('Add the full link to your public profile (https://…).'); return }
    if (d.mobile.replace(/\D/g, '').length < 7) { setError('Enter a mobile number with country code.'); return }
    if (!agree) { setError('Please confirm the declaration to continue.'); return }
    if (d.handle[0] !== '@') d.handle = '@' + d.handle
    setBusy(true)
    try {
      if (google) {
        const r = await Store.googleAuth(google.credential, 'register', d)
        if (!r.ok) {
          if (r.code === 'GOOGLE_INVALID') {
            setGoogle(null); setStep(1)
            setError('Your Google session expired. Click the Google button again.')
          } else setError(r.message || 'Could not create your account.')
          return
        }
      } else {
        await Store.nominate(d)
      }
      navigate('/dashboard?welcome=1')
    } catch (err) {
      setError(errorText(err, 'Could not create your account. Try again.'))
      const errs = err && err.payload && err.payload.errors
      if (errs && (errs.email || errs.password || errs.name)) setStep(1)
    } finally { setBusy(false) }
  }

  return (
    <AuthLayout
      wide={step === 2}
      title={step === 1 ? 'Create your account' : 'Your nomination profile'}
      sub={step === 1
        ? 'Nominate yourself for the ProFluencer Awards 2026. Free, takes about three minutes.'
        : 'The awards team verifies every profile before it goes public and can receive votes.'}
      artTitle="Put your name on the ballot."
      footer={<>Already registered? <Link className="au-link" to="/login">Sign in</Link></>}
    >
      <div className="au-steps" aria-hidden="true">
        <div className="on"><i />1 · Account</div>
        <div className={step === 2 ? 'on' : ''}><i />2 · Profile</div>
        <div><i />3 · Verification</div>
      </div>
      <div className={`form-error${error ? ' show' : ''}`} role="alert">{error}</div>

      {step === 1 && (
        <>
          <form onSubmit={next} noValidate>
            <Field label="Full name (as on your ID)"><input value={f.legalName} onChange={set('legalName')} autoComplete="name" placeholder="Your legal name" /></Field>
            <Field label="Email"><input type="email" value={f.email} onChange={set('email')} autoComplete="email" placeholder="you@email.com" /></Field>
            <Field label="Password" hint="At least 8 characters."><PasswordInput value={f.password} onChange={set('password')} autoComplete="new-password" placeholder="Create a password" /></Field>
            <button className="abtn primary au-submit" type="submit">Continue</button>
          </form>
          {googleOn && <OrDivider />}
          <GoogleButton onCredential={onGoogle} text="signup_with" />
        </>
      )}

      {step === 2 && (
        <form onSubmit={submit} noValidate>
          {google && <div className="au-note">Signing up with Google as <b>{google.email}</b></div>}
          <div className="au-grid">
            <Field label="Public display name *"><input value={f.displayName} onChange={set('displayName')} placeholder="How fans know you" /></Field>
            <Field label="Award category *">
              <select value={f.categoryId} onChange={set('categoryId')}>
                <option value="">Choose one category</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Main platform *">
              <select value={f.platform} onChange={set('platform')}>
                <option value="">Select</option>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Handle *"><input value={f.handle} onChange={set('handle')} placeholder="@yourhandle" /></Field>
            <div className="span2"><Field label="Public profile link *" hint="Reviewers open this to confirm the profile is real and yours."><input type="url" value={f.profileUrl} onChange={set('profileUrl')} placeholder="https://instagram.com/yourhandle" /></Field></div>
            <Field label="Followers"><input value={f.followers} onChange={set('followers')} placeholder="e.g. 250K" /></Field>
            <Field label="Mobile (with country code) *"><input type="tel" value={f.mobile} onChange={set('mobile')} placeholder="+971 5X XXX XXXX" autoComplete="tel" /></Field>
            <Field label="Country"><input value={f.country} onChange={set('country')} placeholder="United Arab Emirates" /></Field>
            <Field label="City"><input value={f.city} onChange={set('city')} placeholder="Dubai" /></Field>
            <div className="span2"><Field label="Short bio"><textarea value={f.bio} onChange={set('bio')} rows="3" maxLength="280" placeholder="What you create and why your audience loves it" /></Field></div>
          </div>
          <label className="au-check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>This is my own public creator profile, I am 18 or older, and I accept the <Link to="/terms">voting rules and terms</Link>.</span>
          </label>
          <div className="au-actions">
            {!google && <button type="button" className="abtn" onClick={() => setStep(1)}>Back</button>}
            <button className="abtn primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for verification'}</button>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
