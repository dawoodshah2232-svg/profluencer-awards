import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout, { OrDivider, PasswordInput } from '../components/AuthLayout'
import GoogleButton, { useGoogleEnabled } from '../components/GoogleButton'
import { Field } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store, isDemoMode } from '../lib/store'
import { Demo } from '../lib/demoData'

export default function Login() {
  const navigate = useNavigate()
  const googleOn = useGoogleEnabled()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [demoId, setDemoId] = useState('')

  const { data: existing } = useAsync(() => Store.session(), [])
  const { data: demos = [] } = useAsync(async () => {
    if (!isDemoMode()) return []
    const list = await Store.approved()
    return list.filter((x) => String(x.id).indexOf('seed-') === 0).slice(0, 10)
  }, [])

  useEffect(() => {
    if (existing) navigate('/dashboard', { replace: true })
  }, [existing, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Enter the email you registered with.'); return }
    if (!password) { setError('Enter your password.'); return }
    setBusy(true)
    try {
      const inf = await Store.login(email.trim(), password)
      if (!inf) { setError('This account has no creator profile. Staff members sign in from the admin panel.'); return }
      navigate('/dashboard')
    } catch (err) {
      setError(err && err.status === 422 ? 'Email or password is incorrect.' : err && err.status === 429 ? 'Too many attempts. Wait a minute and try again.' : 'Could not sign in. Try again.')
    } finally { setBusy(false) }
  }

  const onGoogle = async (credential) => {
    setError('')
    setBusy(true)
    try {
      const r = await Store.googleAuth(credential, 'login')
      if (r.ok) { navigate('/dashboard'); return }
      if (r.code === 'GOOGLE_NO_ACCOUNT') {
        navigate('/register', { state: { google: { credential, name: r.name, email: r.email } } })
        return
      }
      setError(r.message || 'Google sign-in failed. Try again.')
    } catch { setError('Google sign-in failed. Try again.') } finally { setBusy(false) }
  }

  return (
    <AuthLayout
      title="Welcome back"
      sub="Sign in to your creator dashboard to track votes live and share your voting link."
      footer={<>New to ProFluencer Awards? <Link className="au-link" to="/register">Create your account</Link></>}
    >
      <div className={`form-error${error ? ' show' : ''}`} role="alert">{error}</div>
      <form onSubmit={submit} noValidate>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="au-row">
          <span />
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <button className="abtn primary au-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>

      {googleOn && <OrDivider />}
      <GoogleButton onCredential={onGoogle} text="signin_with" />

      {isDemoMode() && demos.length > 0 && (
        <>
          <OrDivider />
          <Field label="Demo — open a sample dashboard">
            <select value={demoId} onChange={(e) => setDemoId(e.target.value)}>
              <option value="">Select a sample profile…</option>
              {demos.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <button className="abtn au-submit" type="button" disabled={!demoId} onClick={() => { Demo.setSession(demoId); navigate('/dashboard') }}>Open demo dashboard</button>
        </>
      )}
    </AuthLayout>
  )
}
