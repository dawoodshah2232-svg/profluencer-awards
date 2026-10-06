import { useState } from 'react'
import { Field, PageHero } from '../components/ui'
import { Store } from '../lib/store'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'Nomination support', message: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Please enter your name.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { setError('Please enter a valid email.'); return }
    if (!form.message.trim()) { setError('Please write your message.'); return }
    try {
      await Store.addEnquiry({ ...form })
      setDone(true)
    } catch {
      setError('Could not send your message. Try again.')
    }
  }

  return (
    <>
      <PageHero
        eyebrow="We reply fast"
        title="Contact the team"
        sub="Nominations, voting support, ceremony, media or partnerships — pick a topic and we'll route it to the right desk."
      />
      <section style={{ paddingTop: 10 }}>
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="form-card">
            <div className={`form-ok${done ? ' show' : ''}`} style={{ marginBottom: 14 }}>Message received — we reply within two working days.</div>
            {!done && (
              <form onSubmit={submit} noValidate>
                <div className={`form-error${error ? ' show' : ''}`}>{error}</div>
                <div className="form-2col">
                  <Field label="Name *"><input value={form.name} onChange={set('name')} autoComplete="name" /></Field>
                  <Field label="Email *"><input value={form.email} onChange={set('email')} type="email" autoComplete="email" /></Field>
                </div>
                <Field label="Topic">
                  <select value={form.subject} onChange={set('subject')}>
                    {['Nomination support', 'Voting support', 'Ceremony & RSVP', 'Media', 'Partnerships', 'Something else'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Message *"><textarea value={form.message} onChange={set('message')} rows="4" placeholder="How can we help?" /></Field>
                <button className="btn btn-gold btn-block" type="submit">Send message</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
