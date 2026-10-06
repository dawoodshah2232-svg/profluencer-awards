import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field, PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store, isDemoMode } from '../lib/store'
import { Demo } from '../lib/demoData'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [demoId, setDemoId] = useState('')

  const { data: existing } = useAsync(() => Store.session(), [])
  const { data: demos = [] } = useAsync(async () => {
    const list = await Store.approved()
    return list.filter((x) => String(x.id).indexOf('seed-') === 0).slice(0, 10)
  }, [])
  const { data: cats = [] } = useAsync(() => Store.categories(), [])

  useEffect(() => {
    if (existing) navigate('/dashboard', { replace: true })
  }, [existing, navigate])
  if (existing) return null

  const catName = (id) => (cats.find((c) => c.id === id) || {}).name || ''

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const inf = await Store.login(email, password)
      if (!inf) {
        setError('Email or password not recognized. Check your details or nominate yourself first.')
        return
      }
      navigate('/dashboard')
    } catch {
      setError('Could not log in. Try again.')
    }
  }

  const demoLogin = async () => {
    if (!demoId) return
    // Demo shortcut: open the dashboard as a seeded sample profile.
    Demo.setSession(demoId)
    navigate('/dashboard')
  }

  return (
    <>
      <PageHero>
        <div className="center" style={{ maxWidth: 520, margin: '0 auto' }}>
          <img src={img('img/logo-clean.png')} alt="ProFluencer Awards Dubai 2026" style={{ width: 210, maxWidth: '80%', margin: '0 auto 18px' }} />
          <h1 className="sec-title" style={{ fontSize: 'clamp(26px,5vw,36px)' }}>Influencer Portal</h1>
          <p className="sec-sub" style={{ margin: '0 auto' }}>Log in to track your votes live.</p>
        </div>
      </PageHero>

      <section style={{ paddingTop: 10 }}>
        <div className="container" style={{ maxWidth: 480 }}>
          <div className="form-card">
            <div className={`form-error${error ? ' show' : ''}`}>{error}</div>
            <form onSubmit={submit} noValidate>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" autoComplete="email" />
              </Field>
              <Field label="Password">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Your password" autoComplete="current-password" />
              </Field>
              <button className="btn btn-gold btn-block" type="submit">Log in to dashboard</button>
              <p className="hint center" style={{ marginTop: 14 }}>Not nominated yet? <Link to="/nominate" style={{ color: 'var(--gold-lt)', fontWeight: 700 }}>Create your nomination</Link></p>
            </form>

            {isDemoMode() && (
            <>
            <div className="divider">Demo access</div>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}>
              <span className="demo-tag">Demo</span>&nbsp; Explore a dashboard instantly with a seeded sample profile. Not real people, not real votes.
            </p>
            <Field label="Sample nominee">
              <select value={demoId} onChange={(e) => setDemoId(e.target.value)}>
                <option value="">Select a sample profile…</option>
                {demos.map((x) => (
                  <option key={x.id} value={x.id}>{x.name} — {catName(x.categoryId)}</option>
                ))}
              </select>
            </Field>
            <button className="btn btn-ghost btn-block" type="button" onClick={demoLogin} disabled={!demoId}>Open demo dashboard</button>
            </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
