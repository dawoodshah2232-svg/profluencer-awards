import { useState } from 'react'
import { Field } from '../components/ui'
import { Store } from '../lib/store'
import { useDates, weekdayDate } from '../lib/dates'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

export default function Event() {
  const dates = useDates()
  const [form, setForm] = useState({ name: '', email: '', mobile: '', guests: '1', type: 'guest' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Please enter your name.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { setError('Please enter a valid email.'); return }
    try {
      await Store.addRsvp({ ...form, guests: parseInt(form.guests, 10) || 1 })
      setDone(true)
    } catch {
      setError('Could not record your RSVP. Try again.')
    }
  }

  return (
    <>
      <div className="ceremony" style={{ paddingTop: 140 }}>
        <div className="container">
          <div className="center">
            <span className="eyebrow" style={{ color: '#9c7a1e' }}>You are invited</span>
            <h1 className="sec-title">The awards afternoon</h1>
            <p className="sec-sub">Fifty golden trophies. Ten industries. One unforgettable afternoon in Dubai.</p>
          </div>
          <div className="cer-grid">
            <div className="cer-img"><img src={img('img/ceremony.jpg')} alt="Awards ceremony celebration" /></div>
            <div>
              <div className="cer-facts">
                <div className="cer-fact"><b>{weekdayDate(dates.ceremonyDate)}</b><span>Afternoon session &middot; {dates.ceremonyCity}</span></div>
                <div className="cer-fact"><b>{dates.ceremonyCity}, UAE</b><span>{dates.ceremonyVenue || 'Venue announced soon'}</span></div>
                <div className="cer-fact"><b>50 honourees</b><span>Top 5 of every category</span></div>
                <div className="cer-fact"><b>Evening gala</b><span>Celebrations after the stage</span></div>
              </div>
              <p style={{ marginTop: 20, color: '#5a5a5a', fontSize: 14.5 }}>Winners are announced live on stage in each of the 10 categories, then celebrated at the evening gala. Approved nominees, sponsors and invited guests receive invitations &mdash; confirm yours below.</p>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="center">
            <span className="eyebrow">RSVP</span>
            <h2 className="sec-title" style={{ fontSize: 'clamp(24px,4.5vw,36px)' }}>Reserve your seat</h2>
            <p className="sec-sub">RSVPs are reviewed by the events team. Confirmed guests receive their invitation by email.</p>
          </div>
          <div className="form-card" style={{ marginTop: 28 }}>
            <div className={`form-ok${done ? ' show' : ''}`} style={{ marginBottom: 14 }}>Thank you — your RSVP is recorded. Watch your inbox for the invitation.</div>
            {!done && (
              <form onSubmit={submit} noValidate>
                <div className={`form-error${error ? ' show' : ''}`}>{error}</div>
                <div className="form-2col">
                  <Field label="Full name *"><input value={form.name} onChange={set('name')} autoComplete="name" /></Field>
                  <Field label="Email *"><input value={form.email} onChange={set('email')} type="email" autoComplete="email" /></Field>
                </div>
                <div className="form-2col">
                  <Field label="Mobile"><input value={form.mobile} onChange={set('mobile')} type="tel" autoComplete="tel" /></Field>
                  <Field label="Guests">
                    <select value={form.guests} onChange={set('guests')}>
                      <option value="1">Just me</option>
                      <option value="2">+1 guest</option>
                      <option value="3">+2 guests</option>
                    </select>
                  </Field>
                </div>
                <Field label="I am a…">
                  <select value={form.type} onChange={set('type')}>
                    <option value="guest">Guest</option>
                    <option value="nominee">Approved nominee</option>
                    <option value="sponsor">Sponsor</option>
                    <option value="media">Media</option>
                    <option value="brand">Brand partner</option>
                  </select>
                </Field>
                <button className="btn btn-gold btn-block" type="submit">Confirm RSVP</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
