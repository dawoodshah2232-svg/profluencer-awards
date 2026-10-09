import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout, { PasswordInput } from '../components/AuthLayout'
import { Field } from '../components/ui'
import { errorText } from '../components/AdminUI'
import { Store } from '../lib/store'

/* Step 1: ask for the email; the API mails a one-hour reset link. */
export function ForgotPassword() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const backTo = params.get('from') === 'admin' ? '/admin' : '/login'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Enter the email you registered with.'); return }
    setBusy(true)
    try { await Store.forgotPassword(email.trim()); setSent(true) } catch (err) {
      setError(err && err.status === 429 ? 'Too many requests. Wait a minute and try again.' : errorText(err))
    } finally { setBusy(false) }
  }

  return (
    <AuthLayout
      title={sent ? 'Check your inbox' : 'Forgot your password?'}
      sub={sent
        ? `If an account exists for ${email.trim()}, we have sent a link to choose a new password. It expires in 60 minutes.`
        : 'Enter your account email and we will send you a link to choose a new password.'}
      artTitle="Back in a minute."
      footer={<>Remembered it? <Link className="au-link" to={backTo}>Back to sign in</Link></>}
    >
      {!sent ? (
        <form onSubmit={submit} noValidate>
          <div className={`form-error${error ? ' show' : ''}`} role="alert">{error}</div>
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@email.com" /></Field>
          <button className="abtn primary au-submit" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      ) : (
        <>
          <div className="au-note">Not there? Check spam, or <button type="button" className="au-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }} onClick={() => setSent(false)}>try another email</button>.</div>
          <Link className="abtn primary au-submit" to={backTo}>Back to sign in</Link>
        </>
      )}
    </AuthLayout>
  )
}

/* Step 2: the link from the email lands here with ?token=&email=. */
export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const email = params.get('email') || ''
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (pw !== pw2) { setError('The two passwords do not match.'); return }
    setBusy(true)
    try {
      await Store.resetPassword({ token, email, password: pw, password_confirmation: pw2 })
      setDone(true)
    } catch (err) { setError(errorText(err, 'This reset link is invalid or has expired.')) } finally { setBusy(false) }
  }

  if (!token || !email) {
    return (
      <AuthLayout title="Reset link incomplete" sub="Open the link from your email again, or request a new one."
        footer={<Link className="au-link" to="/forgot-password">Request a new link</Link>} />
    )
  }

  return (
    <AuthLayout
      title={done ? 'Password updated' : 'Choose a new password'}
      sub={done ? 'You can now sign in with your new password.' : `For ${email}`}
      artTitle="Back in a minute."
    >
      {done ? (
        <div className="au-actions">
          <Link className="abtn primary" to="/login">Creator sign in</Link>
          <Link className="abtn" to="/admin">Admin sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className={`form-error${error ? ' show' : ''}`} role="alert">{error}</div>
          <Field label="New password" hint="At least 8 characters."><PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="New password" /></Field>
          <Field label="Confirm new password"><PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" placeholder="Repeat the password" /></Field>
          <button className="abtn primary au-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
          {error && <p className="au-foot"><Link className="au-link" to="/forgot-password">Request a new link</Link></p>}
        </form>
      )}
    </AuthLayout>
  )
}
