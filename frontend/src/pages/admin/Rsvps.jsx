import { useState } from 'react'
import { Btn, Card, PageIntro, SearchBox, StatCard, Tag, errorText } from '../../components/AdminUI'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store } from '../../lib/store'
import { longDate, useDates } from '../../lib/dates'
import { downloadCSV } from './csv'

export default function Rsvps({ refreshKey }) {
  const toast = useToast()
  const dates = useDates()
  const [q, setQ] = useState('')
  const [ftype, setFtype] = useState('')
  const { data: rsvps = [], reload, loading } = useAsync(() => Store.rsvps(), [refreshKey])

  const checked = rsvps.filter((r) => r.checkedIn).length
  const guests = rsvps.reduce((a, r) => a + (Number(r.guests) || 1), 0)
  const pct = rsvps.length ? Math.round((checked / rsvps.length) * 100) : 0
  const types = [...new Set(rsvps.map((r) => r.type))]
  const term = q.trim().toLowerCase()
  const filtered = rsvps.filter((r) => (!ftype || r.type === ftype) && (!term || [r.name, r.email, r.mobile].join(' ').toLowerCase().includes(term)))

  const toggle = async (r) => {
    try { await Store.toggleCheckIn(r.id, r.checkedIn); toast(r.checkedIn ? 'Check-in undone' : `${r.name} checked in`) } catch (e) { toast(errorText(e)) }
    reload()
  }
  const remove = async (r) => {
    if (!window.confirm(`Delete the RSVP from ${r.name}?`)) return
    try { await Store.deleteRsvp(r.id); toast('RSVP deleted') } catch (e) { toast(errorText(e)) }
    reload()
  }
  const exportRsvp = () => {
    const rows = [['name', 'email', 'mobile', 'type', 'guests', 'checked_in', 'at']]
    rsvps.forEach((r) => rows.push([r.name, r.email, r.mobile || '', r.type, r.guests, r.checkedIn ? 'yes' : 'no', r.at ? new Date(r.at).toISOString() : '']))
    downloadCSV('rsvps.csv', rows)
    toast('RSVPs exported')
  }

  return (
    <>
      <PageIntro right={<Btn icon="download" onClick={exportRsvp}>Export CSV</Btn>}>
        Ceremony guest list for {longDate(dates.ceremonyDate)} in {dates.ceremonyCity}. Use check-in at the door; mistakes can be undone.
      </PageIntro>
      <div className="stat-grid">
        <StatCard icon="calendar" value={rsvps.length} label="Total RSVPs" sub={`${guests} seats incl. +1s`} />
        <StatCard icon="check" tone="green" value={checked} label="Checked in" sub={`${pct}% arrival rate`} />
        <StatCard icon="users" tone="blue" value={rsvps.length - checked} label="Yet to arrive" />
        <StatCard icon="grid" value={types.length} label="Guest types" sub={types.join(' · ') || '—'} />
      </div>
      <Card title="Check-in progress">
        <div className="progress"><i style={{ width: `${pct}%` }} /></div>
        <p className="hint">{checked} of {rsvps.length} checked in ({pct}%)</p>
      </Card>
      <div className="atool">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, email, mobile…" />
        <select className="ainput" value={ftype} onChange={(e) => setFtype(e.target.value)}>
          <option value="">All guest types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <Card flush>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr><th>Guest</th><th>Type</th><th>Seats</th><th>RSVP date</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name}</b><div className="muted">{r.email}{r.mobile ? ` · ${r.mobile}` : ''}</div></td>
                  <td><Tag>{r.type}</Tag></td>
                  <td>{r.guests}</td>
                  <td className="muted">{r.at ? Store.fmtTime(r.at) : '—'}</td>
                  <td>{r.checkedIn ? <Tag tone="green">checked in</Tag> : <Tag>expected</Tag>}</td>
                  <td><div className="actions">
                    <Btn size="sm" variant={r.checkedIn ? '' : 'ok'} onClick={() => toggle(r)}>{r.checkedIn ? 'Undo' : 'Check in'}</Btn>
                    <Btn size="sm" variant="danger" icon="trash" onClick={() => remove(r)} aria-label={`Delete RSVP from ${r.name}`} />
                  </div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="6" className="empty">{loading ? 'Loading…' : 'No RSVPs yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
