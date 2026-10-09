import { useState } from 'react'
import { Field, PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

export default function Sponsors() {
  const { data: tiers = [] } = useAsync(() => Store.content('sponsor_tier'), [])
  const [form, setForm] = useState({ name: '', company: '', email: '', tier: 'Presenting Partner', message: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.company.trim()) { setError('Please enter your name and company.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { setError('Please enter a valid email.'); return }
    try {
      await Store.addEnquiry({
        name: `${form.name.trim()} (${form.company.trim()})`,
        email: form.email.trim(),
        subject: `Sponsorship — ${form.tier}`,
        message: form.message.trim() || 'Requested the partnership deck.',
      })
      setDone(true)
    } catch {
      setError('Could not send your request. Try again.')
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Partnerships"
        title="Put your brand on the golden stage"
        sub="50 winning creators. 10 industries. Millions of verified voters. Sponsors get stage time, broadcast visibility and direct access to the region's most influential audience builders."
      />
      <section style={{ paddingTop: 10 }}>
        <div className="container">
          <div className="steps" style={{ gridTemplateColumns: '1fr' }}>
            {tiers.map((t) => (
              <div className="step" key={t.id}>
                <div className="n">&#9670;</div>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
          <div className="form-card" style={{ maxWidth: 640, margin: '30px auto 0' }}>
            <h3 style={{ marginBottom: 8 }}>Request the partnership deck</h3>
            <p className="hint">Tell us about your brand — the partnerships team replies within two working days.</p>
            <div className={`form-ok${done ? ' show' : ''}`} style={{ margin: '14px 0' }}>Thank you. Your request is with the partnerships team.</div>
            {!done && (
              <form onSubmit={submit} noValidate style={{ marginTop: 14 }}>
                <div className={`form-error${error ? ' show' : ''}`}>{error}</div>
                <div className="form-2col">
                  <Field label="Name *"><input value={form.name} onChange={set('name')} /></Field>
                  <Field label="Company *"><input value={form.company} onChange={set('company')} /></Field>
                </div>
                <div className="form-2col">
                  <Field label="Email *"><input value={form.email} onChange={set('email')} type="email" /></Field>
                  <Field label="Tier of interest">
                    <select value={form.tier} onChange={set('tier')}>
                      {[...tiers.map((t) => t.title), 'Not sure yet'].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Message"><textarea value={form.message} onChange={set('message')} rows="3" placeholder="What are you hoping to achieve?" /></Field>
                <button className="btn btn-gold btn-block" type="submit">Request deck</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
