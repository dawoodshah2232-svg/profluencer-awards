import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field, PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'
import { useToast } from '../components/Layout'

export default function Nominate() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: cats = [] } = useAsync(() => Store.categories(), [])
  const { data: settings } = useAsync(() => Store.settings(), [])
  const { data: existing } = useAsync(() => Store.session(), [])
  const [form, setForm] = useState({
    legalName: '', displayName: '', email: '', mobile: '', country: '', city: '',
    categoryId: '', platform: '', handle: '', profileUrl: '', followers: '', bio: '', password: '',
  })
  const [agree, setAgree] = useState(false)
  const [mkt, setMkt] = useState(false)
  const [photo, setPhoto] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (existing) navigate('/dashboard', { replace: true })
  }, [existing, navigate])
  if (existing) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onPhoto = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    if (f.size > 600 * 1024) { toast('Photo too large — max 600KB'); e.target.value = ''; return }
    const r = new FileReader()
    r.onload = () => setPhoto(r.result)
    r.readAsDataURL(f)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const d = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v).trim()]))
    const req = ['legalName', 'displayName', 'email', 'mobile', 'country', 'city', 'categoryId', 'platform', 'handle', 'profileUrl', 'bio', 'password']
    for (const k of req) if (!d[k]) { setError('Please complete all required fields.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { setError('Please enter a valid email address.'); return }
    if (d.mobile.replace(/\D/g, '').length < 7) { setError('Please enter a valid mobile number with country code.'); return }
    if (d.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (d.handle[0] !== '@') d.handle = '@' + d.handle
    if (!agree) { setError('Please accept the voting rules to continue.'); return }
    setSubmitting(true)
    try {
      await Store.nominate({ ...d, photo, marketingConsent: mkt })
      navigate('/dashboard?welcome=1')
    } catch {
      setError('Could not submit your nomination. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Free nomination · 18+"
        title="Put your name on the ballot"
        sub="Complete your profile below. Our team reviews every nomination for authenticity and category fit before it goes live. One active nomination per influencer per edition."
      />
      <section style={{ paddingTop: 10 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="form-card">
            <div className={`form-error${error ? ' show' : ''}`}>{error}</div>
            <form onSubmit={submit} noValidate>
              <h3 style={{ marginBottom: 16, fontSize: 17 }}>Identity</h3>
              <div className="form-2col">
                <Field label={<>Legal name * <span className="hint" style={{ display: 'inline' }}>— private, for records</span></>}>
                  <input value={form.legalName} onChange={set('legalName')} placeholder="As on your ID" autoComplete="name" />
                </Field>
                <Field label="Public display name *">
                  <input value={form.displayName} onChange={set('displayName')} placeholder="How fans know you" />
                </Field>
              </div>
              <div className="form-2col">
                <Field label="Email *">
                  <input value={form.email} onChange={set('email')} type="email" placeholder="you@email.com" autoComplete="email" />
                </Field>
                <Field label="Mobile (with country code) *">
                  <input value={form.mobile} onChange={set('mobile')} type="tel" placeholder="+971 5X XXX XXXX" autoComplete="tel" />
                </Field>
              </div>
              <div className="form-2col">
                <Field label="Country *">
                  <input value={form.country} onChange={set('country')} placeholder="United Arab Emirates" />
                </Field>
                <Field label="City *">
                  <input value={form.city} onChange={set('city')} placeholder="Dubai" />
                </Field>
              </div>

              <h3 style={{ margin: '26px 0 16px', fontSize: 17 }}>Your category &amp; profiles</h3>
              <Field label="Industry category *" hint="Category changes are allowed before voting opens (Oct 15). After that, categories are locked.">
                <select value={form.categoryId} onChange={set('categoryId')} required>
                  <option value="">Select your category — one per influencer</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.tagline}</option>)}
                </select>
              </Field>
              <div className="form-2col">
                <Field label="Primary platform *">
                  <select value={form.platform} onChange={set('platform')} required>
                    <option value="">Select</option>
                    {['Instagram', 'TikTok', 'YouTube', 'Twitch', 'X', 'Facebook'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Handle *">
                  <input value={form.handle} onChange={set('handle')} placeholder="@yourhandle" />
                </Field>
              </div>
              <Field label="Profile URL *" hint="Must be publicly accessible — reviewers verify it.">
                <input value={form.profileUrl} onChange={set('profileUrl')} type="url" placeholder="https://instagram.com/yourhandle" />
              </Field>
              <div className="form-2col">
                <Field label="Followers (self-reported)">
                  <input value={form.followers} onChange={set('followers')} placeholder="e.g. 250K" />
                </Field>
                <Field label="Profile photo" hint="Optional — square photo works best.">
                  <input type="file" accept="image/*" onChange={onPhoto} />
                </Field>
              </div>
              <Field label="Short bio *">
                <textarea value={form.bio} onChange={set('bio')} rows="3" maxLength="280" placeholder="What you create and why your audience loves you (max 280 chars)" />
              </Field>

              <h3 style={{ margin: '26px 0 16px', fontSize: 17 }}>Account &amp; consent</h3>
              <Field label="Create password *">
                <input value={form.password} onChange={set('password')} type="password" minLength="8" placeholder="Min. 8 characters — for your dashboard login" autoComplete="new-password" />
              </Field>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, marginBottom: 12 }}>
                <input type="checkbox" checked={mkt} onChange={(e) => setMkt(e.target.checked)} style={{ width: 'auto', marginTop: 4 }} />
                <span>Keep me posted with ProFluencer news and future editions (optional).</span>
              </label>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, marginBottom: 20 }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 'auto', marginTop: 4 }} />
                <span>I confirm this is my own public creator profile, I am 18 or older, and I accept the <Link to="/terms" style={{ color: 'var(--gold-lt)', textDecoration: 'underline' }}>voting rules and terms</Link> (version {settings ? settings.termsVersion : '—'}).</span>
              </label>
              <button className="btn btn-gold btn-block" type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit nomination'}
              </button>
              <p className="hint center" style={{ marginTop: 14 }}>Already nominated? <Link to="/login" style={{ color: 'var(--gold-lt)', fontWeight: 700 }}>Log in to your dashboard</Link></p>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
