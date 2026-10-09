import { useState } from 'react'
import { Btn, Card, PageIntro, Tag, errorText } from '../../components/AdminUI'
import { Field } from '../../components/ui'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store, isDemoMode } from '../../lib/store'
import { longDate, weekdayDate } from '../../lib/dates'

const day = (s) => String(s || '').slice(0, 10)

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
