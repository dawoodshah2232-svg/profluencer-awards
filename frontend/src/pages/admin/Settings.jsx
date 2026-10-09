import { useState } from 'react'
import { Btn, Card, PageIntro, Tag, errorText } from '../../components/AdminUI'
import { Field } from '../../components/ui'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store, isDemoMode } from '../../lib/store'
import { longDate, weekdayDate } from '../../lib/dates'

const day = (s) => String(s || '').slice(0, 10)

const MAIL_PRESETS = {
  brevo_smtp: { smtp_host: 'smtp-relay.brevo.com', smtp_port: '587', smtp_encryption: 'tls' },
  cpanel: { smtp_host: 'mail.profluencerawards.com', smtp_port: '465', smtp_encryption: 'ssl' },
  gmail: { smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_encryption: 'tls' },
}

/* Email delivery: Brevo (API key) or any SMTP server. Secrets are stored
   encrypted on the server and never sent back — leave blank to keep them. */
function EmailDelivery() {
  const toast = useToast()
  const { data: s, reload } = useAsync(() => Store.mailSettings(), [])
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  if (s && !f) {
    setF({
      driver: s.driver === 'env' ? 'env' : s.driver, from_address: s.from_address || '', from_name: s.from_name || '',
      smtp_host: s.smtp_host || '', smtp_port: s.smtp_port || '587', smtp_username: s.smtp_username || '',
      smtp_password: '', smtp_encryption: s.smtp_encryption || 'tls', brevo_api_key: '',
    })
  }
  if (!s || !f) return null
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const save = async () => {
    setMsg(null)
    if (f.driver !== 'env' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.from_address.trim())) { setMsg({ ok: false, text: 'Enter the sender email (it must be a verified sender in Brevo).' }); return }
    if (f.driver === 'brevo' && !f.brevo_api_key.trim() && !s.brevo_api_key_set) { setMsg({ ok: false, text: 'Paste your Brevo API key.' }); return }
    if (f.driver === 'smtp' && !f.smtp_host.trim()) { setMsg({ ok: false, text: 'Enter the SMTP host.' }); return }
    setBusy(true)
    try {
      const body = { ...f, smtp_port: f.smtp_port ? Number(f.smtp_port) : null }
      for (const k of Object.keys(body)) if (body[k] === '') body[k] = null
      await Store.saveMailSettings(body)
      toast('Email settings saved')
      setF(null); reload()
    } catch (e) { setMsg({ ok: false, text: errorText(e) }) } finally { setBusy(false) }
  }
  const test = async () => {
    setMsg(null)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testTo.trim())) { setMsg({ ok: false, text: 'Enter an email address to send the test to.' }); return }
    setTesting(true)
    try { setMsg({ ok: true, text: await Store.testMail(testTo.trim()) }) } catch (e) { setMsg({ ok: false, text: errorText(e) }) } finally { setTesting(false) }
  }

  const PROVIDERS = [['brevo', 'Brevo API', 'Recommended — API key, no SMTP port needed'], ['smtp', 'SMTP', 'Brevo SMTP, cPanel mail, Gmail or any server'], ['env', 'Server default', 'Use the mail settings from the server .env']]

  return (
    <Card title="Email delivery" sub="Vote codes, password resets, nomination updates and campaigns are sent with these settings. Save, then send a test email."
      right={<Btn variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>}>
      <div className="provider-grid">
        {PROVIDERS.map(([k, label, help]) => (
          <button type="button" key={k} className={`provider${f.driver === k ? ' on' : ''}`} onClick={() => setF((x) => ({ ...x, driver: k }))} aria-pressed={f.driver === k}>
            <b>{label}</b><span>{help}</span>
          </button>
        ))}
      </div>

      {f.driver !== 'env' && (
        <div className="form-grid" style={{ marginTop: 16 }}>
          <Field label="Sender email" hint={f.driver === 'brevo' ? 'Must be a verified sender/domain in Brevo.' : 'Usually the SMTP login address.'}><input value={f.from_address} onChange={set('from_address')} placeholder="noreply@profluencerawards.com" /></Field>
          <Field label="Sender name"><input value={f.from_name} onChange={set('from_name')} placeholder="ProFluencer Awards" /></Field>
        </div>
      )}

      {f.driver === 'brevo' && (
        <>
          <Field label="Brevo API key" hint={s.brevo_api_key_set ? `A key is saved (${s.brevo_api_key_hint}). Leave empty to keep it, or paste a new one to replace it.` : 'Brevo → Settings → SMTP & API → API keys → Generate a new API key (starts with xkeysib-).'}>
            <input type="password" value={f.brevo_api_key} onChange={set('brevo_api_key')} placeholder={s.brevo_api_key_set ? '•••••••••••• saved' : 'xkeysib-…'} autoComplete="off" spellCheck="false" />
          </Field>
          <p className="hint"><a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-lt)', fontWeight: 700 }}>Open Brevo API keys</a> · Add and verify your sender under Senders, Domains &amp; Dedicated IPs.</p>
        </>
      )}

      {f.driver === 'smtp' && (
        <>
          <div className="atool" style={{ marginBottom: 6 }}>
            <span className="hint">Presets:</span>
            <Btn size="sm" onClick={() => setF((x) => ({ ...x, ...MAIL_PRESETS.brevo_smtp }))}>Brevo SMTP</Btn>
            <Btn size="sm" onClick={() => setF((x) => ({ ...x, ...MAIL_PRESETS.cpanel }))}>cPanel mail</Btn>
            <Btn size="sm" onClick={() => setF((x) => ({ ...x, ...MAIL_PRESETS.gmail }))}>Gmail</Btn>
          </div>
          <div className="form-grid">
            <Field label="SMTP host"><input value={f.smtp_host} onChange={set('smtp_host')} placeholder="smtp-relay.brevo.com" /></Field>
            <div className="form-grid" style={{ gap: '0 10px' }}>
              <Field label="Port"><input type="number" value={f.smtp_port} onChange={set('smtp_port')} /></Field>
              <Field label="Encryption">
                <select value={f.smtp_encryption} onChange={set('smtp_encryption')}>
                  <option value="tls">TLS (587)</option><option value="ssl">SSL (465)</option><option value="none">None</option>
                </select>
              </Field>
            </div>
            <Field label="Username"><input value={f.smtp_username} onChange={set('smtp_username')} autoComplete="off" /></Field>
            <Field label="Password / SMTP key" hint={s.smtp_password_set ? 'Saved. Leave empty to keep it.' : 'For Brevo SMTP use the SMTP key, not your login password.'}>
              <input type="password" value={f.smtp_password} onChange={set('smtp_password')} placeholder={s.smtp_password_set ? '•••••••• saved' : ''} autoComplete="new-password" />
            </Field>
          </div>
        </>
      )}

      <div className="divider">Send a test email</div>
      <div className="atool">
        <input className="ainput grow" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@email.com" style={{ flex: 1 }} />
        <Btn icon="inbox" onClick={test} disabled={testing}>{testing ? 'Sending…' : 'Send test'}</Btn>
      </div>
      <p className="hint">Currently sending with: <Tag tone={s.active_mailer === 'log' ? 'amber' : 'green'}>{s.active_mailer}</Tag>{s.active_mailer === 'log' ? ' — emails are only written to the server log, not delivered.' : ''} Save your changes before testing.</p>
      {msg && <div className={`alert ${msg.ok ? 'ok' : 'warn'}`} style={{ marginTop: 12 }}>{msg.text}</div>}
    </Card>
  )
}

/* Social sign-in: Google on the creator login and register pages. Only the
   OAuth Client ID is stored — never a client secret. */
function SocialSignIn({ refreshKey }) {
  const toast = useToast()
  const { data: raw, reload } = useAsync(() => Store.adminSettings(), [refreshKey])
  const [on, setOn] = useState(null)
  const [clientId, setClientId] = useState('')
  const [saved, setSaved] = useState(true)
  const [busy, setBusy] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://profluencerawards.com'

  if (raw && on === null) { setOn(raw.google_enabled === '1'); setClientId(raw.google_client_id || '') }
  if (on === null) return null

  const save = async () => {
    const id = clientId.trim()
    if (on && !/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) { toast('Paste a valid OAuth Client ID (ends with .apps.googleusercontent.com)'); return }
    setBusy(true)
    try {
      await Store.saveRawSettings({ google_enabled: on ? '1' : '0', google_client_id: id || null })
      setSaved(true); toast(on ? 'Google sign-in is live on the login and register pages' : 'Google sign-in turned off')
      reload()
    } catch (e) { toast(errorText(e)) } finally { setBusy(false) }
  }

  return (
    <Card title="Social sign-in" sub="Let creators register and sign in with Google on the login and register pages. Turn it off to hide the button everywhere."
      right={<Btn variant={saved ? '' : 'primary'} icon="check" onClick={save} disabled={busy || saved}>{saved ? 'Saved' : busy ? 'Saving…' : 'Save'}</Btn>}>
      <div className={`social-card${on ? ' on' : ''}`}>
        <div className="social-head">
          <div className="social-logo" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="26" height="26"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
          </div>
          <div className="grow"><b>Google</b><span>{on ? 'Shown on the login and register pages' : 'Hidden — only email sign-in is shown'}</span></div>
          <button type="button" role="switch" aria-checked={on} aria-label="Enable Google sign-in" className={`switch${on ? ' on' : ''}`} onClick={() => { setOn(!on); setSaved(false) }}><i /></button>
        </div>
        <Field label="OAuth Client ID">
          <input value={clientId} onChange={(e) => { setClientId(e.target.value); setSaved(false) }} placeholder="1234567890-abc123.apps.googleusercontent.com" spellCheck="false" />
        </Field>
        <p className="hint">
          Google Cloud → APIs &amp; Services → Credentials → <b>OAuth client ID (Web application)</b>. Add <code>{origin}</code> (and your live domain, e.g. <code>https://profluencerawards.com</code>) under Authorized JavaScript origins, and set the consent screen to <b>In production</b>. Only the Client ID is needed — never paste the client secret.{' '}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-lt)', fontWeight: 700 }}>Open console</a>
        </p>
      </div>
    </Card>
  )
}

export function Settings({ refreshKey, onChanged }) {
  const toast = useToast()
  const { data: s, reload } = useAsync(() => Store.settings(), [refreshKey])
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (s && !f) {
    setF({
      edition: s.edition || '', votingStart: day(s.votingStart), votingEnd: day(s.votingEnd),
      ceremonyDate: day(s.ceremonyDate || '2026-12-11'), ceremonyTime: s.ceremonyTime || '',
      ceremonyCity: s.ceremonyCity || '', ceremonySession: s.ceremonySession || '',
      ceremonyVenue: s.ceremonyVenue || '', termsVersion: s.termsVersion || '',
      awardsPerCategory: String(s.awardsPerCategory || 5),
    })
  }
  if (!s || !f) return <p className="hint">Loading settings…</p>
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const save = async () => {
    setErr('')
    if (!f.votingStart || !f.votingEnd || !f.ceremonyDate) { setErr('Voting dates and the ceremony date are required.'); return }
    if (f.votingEnd < f.votingStart) { setErr('Voting must close on or after the day it opens.'); return }
    if (f.ceremonyDate < f.votingEnd) { setErr('The ceremony must be on or after the voting close date.'); return }
    if (f.ceremonyTime && !/^\d{2}:\d{2}$/.test(f.ceremonyTime)) { setErr('Ceremony time must look like 15:00.'); return }
    setBusy(true)
    try {
      await Store.saveSettings({ ...f, awardsPerCategory: String(Number(f.awardsPerCategory) || 5) })
      toast('Settings saved — the website now shows the new values')
      setF(null); reload(); onChanged()
    } catch (e) { setErr(errorText(e)) } finally { setBusy(false) }
  }
  const reset = async () => {
    if (!window.confirm('Reset ALL demo data to the seeded state? This cannot be undone.')) return
    await Store.resetDemo()
    toast('Demo data reset')
    onChanged()
  }

  return (
    <>
      <PageIntro right={<Btn variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Btn>}>
        Edition dates and ceremony details used across the public website (countdown, home page, event page, footer). Every change is audit-logged.
      </PageIntro>
      <div className={`form-error${err ? ' show' : ''}`}>{err}</div>

      <div className="agrid two">
        <Card title="Voting window" sub="Whole days, Dubai time: opens at the start of the first day, closes at the end of the last.">
          <div className="form-grid">
            <Field label="Voting opens"><input type="date" value={f.votingStart} onChange={set('votingStart')} /></Field>
            <Field label="Voting closes"><input type="date" value={f.votingEnd} onChange={set('votingEnd')} /></Field>
          </div>
          <p className="hint">Status now: <Tag>{s.votingOpen ? 'live' : 'closed'}</Tag> · Changing the window after voting opens should be agreed by two organisers.</p>
        </Card>

        <Card title="Awards ceremony" sub={`Currently: ${weekdayDate(f.ceremonyDate)}`}>
          <div className="form-grid">
            <Field label="Ceremony date"><input type="date" value={f.ceremonyDate} onChange={set('ceremonyDate')} /></Field>
            <Field label="Start time (optional)" hint="Dubai time. Only used for the countdown; public copy says “afternoon session”."><input type="time" value={f.ceremonyTime} onChange={set('ceremonyTime')} /></Field>
            <Field label="City"><input value={f.ceremonyCity} onChange={set('ceremonyCity')} /></Field>
            <Field label="Session"><input value={f.ceremonySession} onChange={set('ceremonySession')} placeholder="afternoon" /></Field>
            <div className="span2"><Field label="Venue" hint="Leave empty until confirmed — the site shows “Venue announced soon”."><input value={f.ceremonyVenue} onChange={set('ceremonyVenue')} /></Field></div>
          </div>
        </Card>
      </div>

      <Card title="Edition">
        <div className="form-grid">
          <Field label="Edition name"><input value={f.edition} onChange={set('edition')} /></Field>
          <Field label="Awards per category"><input type="number" min="1" max="20" value={f.awardsPerCategory} onChange={set('awardsPerCategory')} /></Field>
          <Field label="Terms version"><input value={f.termsVersion} onChange={set('termsVersion')} /></Field>
        </div>
        <p className="hint">Website summary: voting {longDate(f.votingStart)} – {longDate(f.votingEnd)} · ceremony {longDate(f.ceremonyDate)}, {f.ceremonyCity}.</p>
      </Card>

      <EmailDelivery />
      <SocialSignIn refreshKey={refreshKey} />

      {isDemoMode() && (
        <Card title="Danger zone" sub="Reset all demo data (nominations, votes, voters, RSVPs) back to the seeded state.">
          <Btn variant="danger" onClick={reset}>Reset demo data</Btn>
        </Card>
      )}
    </>
  )
}

export function Audit({ refreshKey }) {
  const [q, setQ] = useState('')
  const { data: rows = [], loading } = useAsync(() => Store.auditLog(300), [refreshKey])
  const term = q.trim().toLowerCase()
  const shown = rows.filter((a) => !term || [a.actor, a.action, a.detail].join(' ').toLowerCase().includes(term))
  return (
    <>
      <PageIntro>Append-only record of every admin action, login and vote decision. Entries can never be edited or deleted.</PageIntro>
      <div className="atool">
        <div className="asearch grow">
          <input className="ainput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by actor, action or detail…" style={{ paddingLeft: 12 }} />
        </div>
      </div>
      <Card flush>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>
              {shown.map((a, i) => (
                <tr key={a.id || i}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{Store.fmtTime(a.at)}</td>
                  <td>{a.actor}</td>
                  <td><code style={{ fontSize: 12, color: 'var(--gold-lt)' }}>{a.action}</code></td>
                  <td className="muted">{a.detail || ''}</td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan="4" className="empty">{loading ? 'Loading…' : 'No audit entries.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
