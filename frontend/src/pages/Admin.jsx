import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HBars, HourlyBars, VBarChart } from '../components/Charts'
import { Field, Kpi, Panel, StatusPill } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store, getMode, isDemoMode } from '../lib/store'
import { useToast } from '../components/Layout'

const TABS = [
  ['overview', 'Overview'], ['nominations', 'Nominations'], ['voters', 'Voters'], ['votes', 'Votes'],
  ['results', 'Results'], ['rsvp', 'RSVP'], ['enquiries', 'Enquiries'], ['settings', 'Settings'], ['audit', 'Audit Log'],
]

function downloadCSV(name, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

async function exportVotes(toast) {
  const blob = await Store.exportCsv('votes')
  if (blob) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'votes.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    return
  }
  const rows = [['id', 'time', 'nominee', 'category', 'status', 'reason']]
  const votes = await Store.recentVotes(5000)
  for (const v of votes) {
    const n = await Store.getNominee(v.nomineeId)
    rows.push([v.id, new Date(v.at).toISOString(), n ? n.name : '', v.categoryId, v.status, v.reason || ''])
  }
  downloadCSV('votes.csv', rows)
  toast('Votes exported')
}

/* ================= OVERVIEW ================= */
function Overview({ refreshKey }) {
  const { data: settings } = useAsync(() => Store.settings(), [refreshKey])
  const { data: cats = [] } = useAsync(() => Store.categories(), [refreshKey])
  const { data: all = [] } = useAsync(() => Store.allNominees(), [refreshKey])
  const { data: perDay = [] } = useAsync(() => Store.votesPerDay(null, 14), [refreshKey])
  const { data: byCat = {} } = useAsync(() => Store.votesByCategory(), [refreshKey])
  const { data: blocked = 0 } = useAsync(() => Store.blockedAttempts(), [refreshKey])
  const { data: perHour = [] } = useAsync(() => Store.votesPerHour(24), [refreshKey])
  const { data: feed = [] } = useAsync(() => Store.auditLog(8), [refreshKey])
  const { data: rsvps = [] } = useAsync(() => Store.rsvps(), [refreshKey])
  const { data: enqs = [] } = useAsync(() => Store.enquiries(), [refreshKey])
  const { data: voterStats } = useAsync(() => Store.voterStats(), [refreshKey])
  const { data: state } = useAsync(() => Store.votingState(), [refreshKey])

  const byStatus = useMemo(() => {
    const o = {}
    all.forEach((x) => { o[x.status] = (o[x.status] || 0) + 1 })
    return o
  }, [all])

  if (!settings) return <p className="hint">Loading overview…</p>

  const steps = state === 'upcoming'
    ? [['Nominations', 'Collecting profiles', 'now'], ['Voting', 'Oct 15 – Nov 30', ''], ['Verification', 'Fraud review', ''], ['Ceremony', 'Dec 11 · Dubai', '']]
    : state === 'open'
      ? [['Nominations', 'Complete', 'done'], ['Voting', 'Oct 15 – Nov 30', 'now'], ['Verification', 'After close', ''], ['Ceremony', 'Dec 11 · Dubai', '']]
      : [['Nominations', 'Complete', 'done'], ['Voting', 'Closed Nov 30', 'done'], ['Verification', settings.resultsPublished ? 'Complete' : 'In review', settings.resultsPublished ? 'done' : 'now'], ['Ceremony', 'Dec 11 · Dubai', settings.resultsPublished ? 'now' : '']]

  const hsum = perHour.reduce((a, b) => a + b, 0)
  const hmax = Math.max(0, ...perHour)
  const spike = hsum > 0 && hmax > Math.max(12, (hsum / 24) * 4)

  const catRows = cats.map((c) => ({ label: c.name, value: byCat[c.id] || 0, display: Store.fmt(byCat[c.id] || 0) }))
    .sort((a, b) => b.value - a.value)

  return (
    <>
      <Panel title="Edition timeline">
        <div className="timeline">
          {steps.map((s) => (
            <div className={`tstep ${s[2]}`} key={s[0]}><b>{s[0]}</b><small>{s[1]}</small></div>
          ))}
        </div>
      </Panel>

      <div className="kpis" style={{ marginTop: 14 }}>
        <Kpi value={all.length} label="Nominations total" sub={`${byStatus.pending || 0} awaiting review`} />
        <Kpi value={byStatus.approved || 0} label="Approved nominees" sub="across 10 categories" />
        <Kpi value={Store.fmt(voterStats ? voterStats.counted : 0)} label="Votes counted" sub="verified & valid" />
        <Kpi value={Store.fmt(voterStats ? voterStats.total : 0)} label="Registered voters" sub="email + phone verified identity" />
        <Kpi value={Store.fmt(blocked)} label="Duplicate attempts blocked" sub="same email/phone, same category" />
        <Kpi value={rsvps.length} label="Ceremony RSVPs" sub={`${rsvps.filter((r) => r.checkedIn).length} checked in`} />
        <Kpi value={enqs.filter((e) => !e.read).length} label="Unread enquiries" sub={`${enqs.length} total`} />
        <Kpi value={settings.resultsPublished ? 'LIVE' : 'HIDDEN'} label="Results status" sub={settings.snapshot ? `snapshot v${settings.snapshot.version}` : 'not published yet'} />
      </div>

      {spike ? (
        <div className="alert warn"><b>Unusual voting spike detected.</b> One hour in the last 24 saw {hmax} votes vs an hourly average of {(hsum / 24).toFixed(1)}. Review the Votes tab and hold suspicious records before publishing results.</div>
      ) : (
        <div className="alert ok"><b>Integrity looks healthy.</b> No abnormal hourly spikes in the last 24 hours. {blocked} duplicate-vote attempts blocked so far.</div>
      )}
      {getMode() === 'demo' && (
        <div className="alert info"><b>Demo mode.</b> All figures below come from seeded sample data in this browser — not real nominees or votes.</div>
      )}

      <div className="cols two">
        <Panel title="Votes per day — last 14 days">
          <VBarChart data={perDay} highlightLast />
          <div className="vchart-legend"><span>Older</span><span>Today</span></div>
        </Panel>
        <Panel title="Votes by category">
          <HBars rows={catRows} />
        </Panel>
      </div>

      <div className="cols two">
        <Panel title="Nominations by status">
          <p className="sub">
            {['submitted', 'changes_requested', 'approved', 'rejected', 'withdrawn', 'disqualified']
              .map((k, i) => <span key={k}>{i > 0 && ' · '}<StatusPill status={k} /> {byStatus[k] || 0}</span>)}
          </p>
          <p className="tier-note">Demo data is seeded locally and clearly separated from any future production records.</p>
        </Panel>
        <Panel title="Recent activity">
          {feed.length ? feed.map((a, i) => (
            <div className="feed-item" key={i}>
              <time>{Store.fmtTime(a.at)}</time>
              <div><code>{a.action}</code> <span style={{ color: 'var(--muted)' }}>· {a.actor}{a.detail ? ` · ${a.detail}` : ''}</span></div>
            </div>
          )) : <p className="hint">No activity yet.</p>}
        </Panel>
      </div>
    </>
  )
}

/* ================= NOMINATIONS ================= */
const NOM_STATUSES = ['submitted', 'changes_requested', 'approved', 'rejected', 'withdrawn', 'disqualified']

function Nominations({ refreshKey, onChanged }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [fstatus, setFstatus] = useState('')
  const [fcat, setFcat] = useState('')
  const [selected, setSelected] = useState(new Set())
  const { data: cats = [] } = useAsync(() => Store.categories(), [refreshKey])
  const { data: all = [], reload } = useAsync(() => Store.allNominees(), [refreshKey])

  const catChips = useMemo(() => cats.map((c) => {
    const list = all.filter((x) => x.categoryId === c.id)
    return { id: c.id, name: c.name, approved: list.filter((x) => x.status === 'approved').length, total: list.length }
  }), [cats, all])

  const filtered = all.filter((x) => {
    if (fstatus && x.status !== fstatus) return false
    if (fcat && x.categoryId !== fcat) return false
    const term = q.trim().toLowerCase()
    if (term && ((x.name || '') + ' ' + (x.handle || '') + ' ' + (x.email || '')).toLowerCase().indexOf(term) === -1) return false
    return true
  })

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = (e) => setSelected(e.target.checked ? new Set(filtered.map((x) => x.id)) : new Set())

  const bulk = async (status, note) => {
    if (!selected.size) { toast('Select nominations first'); return }
    for (const id of selected) await Store.setNominationStatus(id, status, note)
    setSelected(new Set())
    toast(`${selected.size} updated`)
    reload(); onChanged()
  }

  const rowAction = async (id, act) => {
    if (act === 'approve') { await Store.setNominationStatus(id, 'approved'); toast('Nomination approved — voting link live') }
    else if (act === 'changes') {
      const n = window.prompt('Note for the influencer (what to fix):')
      if (n === null) return
      await Store.setNominationStatus(id, 'changes_requested', n); toast('Changes requested')
    } else if (act === 'reject') {
      const r = window.prompt('Rejection reason (visible to reviewer log):') || ''
      await Store.setNominationStatus(id, 'rejected', r); toast('Nomination rejected')
    } else if (act === 'remove') {
      if (!window.confirm('Remove this nomination entirely?')) return
      await Store.removeNomination(id); toast('Nomination removed')
    }
    reload(); onChanged()
  }

  const catName = (id) => (cats.find((c) => c.id === id) || {}).name || ''

  return (
    <>
      <div className="chip-row">
        {catChips.map((c) => (
          <span className="catchip" key={c.id}>{c.name} · <b>{c.approved}/{c.total}</b> approved</span>
        ))}
      </div>
      <div className="filters">
        <Field noMargin><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, handle, email…" /></Field>
        <Field noMargin>
          <select value={fstatus} onChange={(e) => setFstatus(e.target.value)}>
            <option value="">All statuses</option>
            {NOM_STATUSES.map((k) => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field noMargin>
          <select value={fcat} onChange={(e) => setFcat(e.target.value)}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="row-actions" style={{ marginBottom: 10 }}>
        <button className="mini-btn" onClick={() => bulk('approved')}>Approve selected</button>
        <button className="mini-btn" onClick={() => { const n = window.prompt('Note for the influencers (what to fix):'); if (n !== null) bulk('changes_requested', n) }}>Request changes</button>
        <button className="mini-btn danger" onClick={() => { if (window.confirm(`Reject ${selected.size} nominations?`)) bulk('rejected', 'Bulk review') }}>Reject selected</button>
        <span className="hint">{selected.size ? `${selected.size} selected` : ''}</span>
      </div>
      <Panel>
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead><tr>
              <th className="checkcell"><input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} aria-label="Select all" /></th>
              <th>Nominee</th><th>Category</th><th>Profile</th><th>Votes</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td className="checkcell"><input type="checkbox" checked={selected.has(x.id)} onChange={() => toggle(x.id)} aria-label={`Select ${x.name}`} /></td>
                  <td><b>{x.name}</b><br />
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{x.email}{x.mobile ? ` · ${x.mobile}` : ''}<br />{x.city}, {x.country}
                      {x.reviewNotes && <><br /><i>Note: {x.reviewNotes}</i></>}</span></td>
                  <td>{catName(x.categoryId)}</td>
                  <td>{x.handle} · {x.platform}<br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{x.followers || ''} followers</span></td>
                  <td><b>{Store.fmt(x.votes)}</b></td>
                  <td><StatusPill status={x.status} /></td>
                  <td><div className="row-actions">
                    <button className="mini-btn" onClick={() => rowAction(x.id, 'approve')}>Approve</button>
                    <button className="mini-btn" onClick={() => rowAction(x.id, 'changes')}>Request changes</button>
                    <button className="mini-btn" onClick={() => rowAction(x.id, 'reject')}>Reject</button>
                    <button className="mini-btn danger" onClick={() => rowAction(x.id, 'remove')}>Remove</button>
                  </div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="7" style={{ color: 'var(--muted)' }}>No nominations match.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

/* ================= VOTERS ================= */
function Voters({ refreshKey }) {
  const { data: st } = useAsync(() => Store.voterStats(), [refreshKey])
  const { data: perDay = [] } = useAsync(() => Store.newVotersPerDay(7), [refreshKey])
  const { data: blocked = 0 } = useAsync(() => Store.blockedAttempts(), [refreshKey])
  if (!st) return <p className="hint">Loading voters…</p>
  return (
    <>
      <div className="kpis">
        <Kpi value={Store.fmt(st.total)} label="Registered voters" sub="unique email + phone identities" />
        <Kpi value={Store.fmt(st.counted)} label="Votes counted" sub="across all categories" />
        <Kpi value={st.avg.toFixed(1)} label="Avg votes per voter" sub="max possible: 10 (one per category)" />
        <Kpi value={Store.fmt(st.multi)} label="Multi-category voters" sub="voted in 2+ categories" />
        <Kpi value={Store.fmt(st.today)} label="New voters today" sub="first-time identities" />
        <Kpi value={Store.fmt(blocked)} label="Duplicate attempts blocked" sub="repeat email/phone per category" />
      </div>
      <Panel title="New voters per day — last 7 days">
        <VBarChart data={perDay} highlightLast small />
        <div className="vchart-legend"><span>7 days ago</span><span>Today</span></div>
        <p className="tier-note">Privacy: voter emails and phone numbers are stored as one-way hashes and never displayed. One identity = one vote per category; the same identity may vote in other categories.</p>
      </Panel>
    </>
  )
}

/* ================= VOTES ================= */
function Votes({ refreshKey, onChanged }) {
  const toast = useToast()
  const [fstatus, setFstatus] = useState('')
  const { data: perHour = [] } = useAsync(() => Store.votesPerHour(24), [refreshKey])
  const { data: cats = [] } = useAsync(() => Store.categories(), [refreshKey])
  const { data: all = [], reload } = useAsync(() => Store.recentVotes(5000), [refreshKey])
  const { data: nameMap } = useAsync(async () => {
    const m = {}
    const list = await Store.approved()
    list.forEach((x) => { m[x.id] = x.name })
    return m
  }, [refreshKey])

  const filtered = fstatus ? all.filter((v) => v.status === fstatus) : all
  const votes = filtered.slice(0, 100)
  const catName = (id) => (cats.find((c) => c.id === id) || {}).name || id

  const invalidate = async (voteId) => {
    const reason = window.prompt('Reason for invalidating this vote:')
    if (reason === null) return
    const ok = await Store.invalidateVote(voteId, reason)
    toast(ok ? 'Vote invalidated' : 'Could not invalidate vote')
    reload(); onChanged()
  }

  return (
    <>
      <Panel title="Voting velocity — last 24 hours"
        sub="Counted votes per hour. Sudden spikes can indicate coordinated voting — investigate before publishing results.">
        <HourlyBars data={perHour} />
        <div className="vchart-legend"><span>24h ago</span><span>Now</span></div>
      </Panel>
      <div className="filters" style={{ gridTemplateColumns: '1fr', marginTop: 14, maxWidth: 320 }}>
        <Field noMargin>
          <select value={fstatus} onChange={(e) => setFstatus(e.target.value)}>
            <option value="">All statuses</option>
            {['counted', 'held', 'invalidated'].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
      </div>
      <Panel title={`Vote ledger — most recent 100${fstatus ? ` (${fstatus})` : ''}`}
        sub="Votes are never edited directly. Invalidate suspicious votes; totals recalculate automatically. Each record keeps its audit trail.">
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead><tr><th>Time</th><th>Nominee</th><th>Category</th><th>Voter</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {votes.map((v) => (
                <tr key={v.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{Store.fmtTime(v.at)}</td>
                  <td>{(nameMap && nameMap[v.nomineeId]) || '(removed)'}</td>
                  <td>{catName(v.categoryId)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>…{String(v.voterId || '').slice(-6)}</td>
                  <td><StatusPill status={v.status} />{v.reason && <><br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{v.reason}</span></>}</td>
                  <td>{v.status === 'counted'
                    ? <button className="mini-btn danger" onClick={() => invalidate(v.id)}>Invalidate</button>
                    : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                </tr>
              ))}
              {!votes.length && <tr><td colSpan="6" style={{ color: 'var(--muted)' }}>No votes match.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <div style={{ marginTop: 14 }}><button className="btn btn-ghost" onClick={() => exportVotes(toast)}>Export votes CSV</button></div>
    </>
  )
}

/* ================= RESULTS ================= */
function Results({ refreshKey, onChanged }) {
  const toast = useToast()
  const { data: settings, reload } = useAsync(() => Store.settings(), [refreshKey])
  const { data: cats = [] } = useAsync(() => Store.categories(), [refreshKey])
  const { data: tops } = useAsync(async () => {
    const list = await Store.categories()
    const out = {}
    for (const c of list) out[c.id] = await Store.top5(c.id)
    return out
  }, [refreshKey])

  if (!settings) return <p className="hint">Loading results…</p>
  const hist = settings.snapshotHistory || []

  const publish = async () => {
    if (window.prompt('Type PUBLISH to freeze and publish results:') !== 'PUBLISH') return
    await Store.publishResults()
    toast('Results published')
    reload(); onChanged()
  }
  const unpublish = async () => {
    if (!window.confirm('Unpublish results from the public?')) return
    await Store.unpublishResults()
    toast('Results hidden')
    reload(); onChanged()
  }

  return (
    <>
      <Panel title="Result control"
        sub="Results stay hidden from the public until you publish. Publishing freezes a snapshot — rank 1 becomes Category Winner, ranks 2–5 become Top 5 Honourees. Ties are already broken deterministically (votes → earliest last vote → earliest approval).">
        <p style={{ margin: '12px 0' }}>Current state: <b>{settings.resultsPublished ? 'PUBLISHED' : 'HIDDEN'}</b>
          {settings.snapshot ? ` · snapshot v${settings.snapshot.version} · ${new Date(settings.snapshot.at).toLocaleString()}` : ''}</p>
        <div className="row-actions">
          {settings.resultsPublished
            ? <button className="btn btn-ghost" onClick={unpublish}>Unpublish results</button>
            : <button className="btn btn-gold" onClick={publish}>Publish results</button>}
        </div>
        <p className="tier-note">Production requires two-person approval. Demo: type PUBLISH to confirm.</p>
      </Panel>

      {hist.length > 0 && (
        <Panel title="Snapshot history" sub="Every publication freezes a versioned snapshot. Older versions are kept for audit.">
          {hist.map((sn, i) => (
            <div className="snap-row" key={sn.version}>
              <b>v{sn.version}</b>
              <span style={{ color: 'var(--muted)' }}>{new Date(sn.at).toLocaleString()}</span>
              {i === 0 && settings.resultsPublished
                ? <span className="status-pill approved">live</span>
                : <span className="hint">superseded</span>}
            </div>
          ))}
        </Panel>
      )}

      {cats.map((c) => (
        <Panel title={c.name} key={c.id}>
          {(tops && tops[c.id] && tops[c.id].length) ? tops[c.id].map((x, i) => (
            <div className="lb-row" key={x.id} style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,.05)', borderRadius: 0, padding: '10px 4px' }}>
              <div className={`rank${i === 0 ? ' r1' : ''}`}>{i + 1}</div>
              <div className="lb-info"><b>{x.name}</b><span>{x.handle} · {i === 0 ? 'Category Winner' : 'Top 5 Honouree'}</span></div>
              <div className="lb-votes"><b>{Store.fmt(x.votes)}</b></div>
            </div>
          )) : <p className="hint">No approved nominees yet.</p>}
        </Panel>
      ))}
    </>
  )
}

/* ================= RSVP ================= */
function Rsvp({ refreshKey }) {
  const toast = useToast()
  const { data: rsvps = [], reload } = useAsync(() => Store.rsvps(), [refreshKey])
  const checked = rsvps.filter((r) => r.checkedIn).length
  const guests = rsvps.reduce((a, r) => a + (r.guests || 1), 0)
  const byType = {}
  rsvps.forEach((r) => { byType[r.type] = (byType[r.type] || 0) + 1 })
  const pct = rsvps.length ? Math.round((checked / rsvps.length) * 100) : 0

  const toggle = async (id) => { await Store.toggleCheckIn(id); reload() }
  const exportRsvp = () => {
    const rows = [['name', 'email', 'mobile', 'type', 'guests', 'checked_in', 'at']]
    rsvps.forEach((r) => rows.push([r.name, r.email, r.mobile || '', r.type, r.guests, r.checkedIn ? 'yes' : 'no', new Date(r.at).toISOString()]))
    downloadCSV('rsvps.csv', rows)
    toast('RSVPs exported')
  }

  return (
    <>
      <div className="kpis">
        <Kpi value={rsvps.length} label="Total RSVPs" sub={`${guests} total guests incl. +1s`} />
        <Kpi value={checked} label="Checked in" sub={`${pct}% arrival rate`} />
        <Kpi value={rsvps.length - checked} label="Yet to arrive" sub="ceremony: Dec 11, afternoon" />
        <Kpi value={Object.keys(byType).length} label="Guest types" sub={Object.keys(byType).map((k) => `${k}: ${byType[k]}`).join(' · ')} />
      </div>
      <Panel title="Check-in progress">
        <div className="progress"><i style={{ width: `${pct}%` }} /></div>
        <p className="hint">{checked} of {rsvps.length} checked in ({pct}%)</p>
      </Panel>
      <Panel>
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Guests</th><th>Checked in</th></tr></thead>
            <tbody>
              {rsvps.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name}</b></td><td>{r.email}</td><td>{r.type}</td><td>{r.guests}</td>
                  <td><button className="mini-btn" onClick={() => toggle(r.id)}>{r.checkedIn ? 'Yes — undo' : 'Check in'}</button></td>
                </tr>
              ))}
              {!rsvps.length && <tr><td colSpan="5" style={{ color: 'var(--muted)' }}>No RSVPs yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <div style={{ marginTop: 14 }}><button className="btn btn-ghost" onClick={exportRsvp}>Export RSVP CSV</button></div>
    </>
  )
}

/* ================= ENQUIRIES ================= */
function Enquiries({ refreshKey, onChanged }) {
  const { data: list = [], reload } = useAsync(() => Store.enquiries().then((l) => l.slice().reverse()), [refreshKey])
  const unread = list.filter((e) => !e.read).length
  const markRead = async (id) => { await Store.markEnquiryRead(id); reload(); onChanged() }
  return (
    <>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)', maxWidth: 520 }}>
        <Kpi value={unread} label="Unread" />
        <Kpi value={list.length} label="Total enquiries" />
      </div>
      <Panel>
        {list.map((e) => (
          <div key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '14px 4px', opacity: e.read ? 0.6 : 1 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <b>{e.name}</b>
              <span className="hint">{e.email} · {Store.fmtTime(e.at)}</span>
              {!e.read && <span className="status-pill submitted">new</span>}
              <span style={{ marginLeft: 'auto' }}>{!e.read && <button className="mini-btn" onClick={() => markRead(e.id)}>Mark read</button>}</span>
            </div>
            {e.subject && <div style={{ fontWeight: 700, marginTop: 6 }}>{e.subject}</div>}
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>{e.message}</p>
          </div>
        ))}
        {!list.length && <p className="hint">No enquiries yet.</p>}
      </Panel>
    </>
  )
}

/* ================= SETTINGS ================= */
function Settings({ refreshKey, onChanged }) {
  const toast = useToast()
  const { data: s, reload } = useAsync(() => Store.settings(), [refreshKey])
  const [edition, setEdition] = useState('')
  const [venue, setVenue] = useState('')
  const [terms, setTerms] = useState('')
  const [ready, setReady] = useState(false)

  if (s && !ready) { setEdition(s.edition); setVenue(s.ceremonyVenue); setTerms(s.termsVersion); setReady(true) }
  if (!s) return <p className="hint">Loading settings…</p>

  const save = async () => {
    await Store.saveSettings({
      edition: edition.trim() || s.edition,
      ceremonyVenue: venue.trim(),
      termsVersion: terms.trim(),
    })
    toast('Settings saved')
    reload(); onChanged()
  }
  const reset = async () => {
    if (!window.confirm('Reset ALL demo data to the seeded state? This cannot be undone.')) return
    await Store.resetDemo()
    toast('Demo data reset')
    onChanged()
  }

  return (
    <>
      <div className="form-card">
        <h3 style={{ marginBottom: 16 }}>Edition settings</h3>
        <Field label="Edition name"><input value={edition} onChange={(e) => setEdition(e.target.value)} /></Field>
        <div className="form-2col">
          <Field label="Voting opens"><input type="datetime-local" defaultValue="2026-10-15T00:00" disabled title="Managed by the backend in production" /></Field>
          <Field label="Voting closes"><input type="datetime-local" defaultValue="2026-11-30T23:59" disabled title="Managed by the backend in production" /></Field>
        </div>
        <Field label="Ceremony"><input type="datetime-local" defaultValue="2026-12-11T15:00" disabled title="Managed by the backend in production" /></Field>
        <Field label="Venue line"><input value={venue} onChange={(e) => setVenue(e.target.value)} /></Field>
        <Field label="Terms version"><input value={terms} onChange={(e) => setTerms(e.target.value)} /></Field>
        <button className="btn btn-gold" onClick={save}>Save settings</button>
        <p className="tier-note">Production: changing the voting window after opening requires dual approval and is audited.</p>
      </div>
      <div className="form-card" style={{ borderColor: '#7f1d1d', marginTop: 14 }}>
        <h3 style={{ marginBottom: 10, color: '#fca5a5' }}>Danger zone</h3>
        <p className="hint">Reset all demo data (nominations, votes, voters, RSVPs) back to the seeded state.</p>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost danger" onClick={reset} style={{ borderColor: '#7f1d1d', color: '#fca5a5' }}>Reset demo data</button>
        </div>
      </div>
    </>
  )
}

/* ================= AUDIT ================= */
function Audit({ refreshKey }) {
  const { data: rows = [] } = useAsync(() => Store.auditLog(100), [refreshKey])
  const blocked = rows.filter((a) => a.action === 'vote_blocked_duplicate').length
  return (
    <>
      <div className="alert ok" style={{ marginBottom: 14 }}>
        <b>Audit integrity:</b> append-only log. {rows.length} recent entries shown
        {blocked ? ` · ${blocked} duplicate-vote blocks` : ''}. Production stores this immutably with UTC timestamps.
      </div>
      <Panel>
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap' }}>{Store.fmtTime(a.at)}</td>
                  <td>{a.actor}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.action}</td>
                  <td style={{ color: 'var(--muted)' }}>{a.detail || ''}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="4" style={{ color: 'var(--muted)' }}>No audit entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

/* ================= ADMIN SHELL ================= */
export default function Admin() {
  const navigate = useNavigate()
  const [authed, setAuthed] = useState(null)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: settings } = useAsync(() => Store.settings(), [authed, refreshKey])
  const { data: state } = useAsync(() => Store.votingState(), [authed, refreshKey])

  useAsync(async () => {
    const ok = await Store.isAdmin()
    setAuthed(!!ok)
    return ok
  }, [])

  const bump = () => setRefreshKey((k) => k + 1)

  const login = async () => {
    setError('')
    try {
      const ok = await Store.adminLogin(user, pass)
      if (ok) setAuthed(true)
      else setError('Invalid credentials.')
    } catch {
      setError('Could not sign in. Try again.')
    }
  }

  const logout = async () => {
    await Store.adminLogout()
    setAuthed(false)
    navigate('/', { replace: true })
  }

  if (authed === null) {
    return <div className="page-hero"><div className="container"><p className="hint">Loading…</p></div></div>
  }

  return (
    <div className="page-hero" style={{ paddingBottom: 26 }}>
      <div className="container">
        {!authed ? (
          <div className="form-card" style={{ maxWidth: 420, margin: '0 auto' }}>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Admin CRM</h2>
            <p className="hint">Organiser sign-in. Staff accounts are issued by the awards team.</p>
            <div className={`form-error${error ? ' show' : ''}`}>{error}</div>
            <Field label="Username"><input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" /></Field>
            <Field label="Password"><input value={pass} onChange={(e) => setPass(e.target.value)} type="password" autoComplete="current-password" onKeyDown={(e) => e.key === 'Enter' && login()} /></Field>
            <button className="btn btn-gold btn-block" onClick={login}>Sign in</button>
            {isDemoMode() && <p className="hint center" style={{ marginTop: 12 }}>Demo access: admin / profluencer2026</p>}
          </div>
        ) : (
          <>
            <div className="dash-head">
              <div>
                <span className="eyebrow">Organiser CRM</span>
                <h2>{settings ? settings.edition : 'ProFluencer Awards 2026'}</h2>
                <p className="hint" style={{ marginTop: 6 }}>
                  Voting: <b>Oct 15 – Nov 30, 2026</b> · State: <b>{state ? state.toUpperCase() : '—'}</b> · Results {settings && settings.resultsPublished ? `PUBLISHED (v${settings.snapshotVersion})` : 'hidden'}
                  {getMode() === 'demo' && <> · <span className="demo-tag">Demo</span></>}
                </p>
              </div>
              <button className="mini-btn" onClick={logout} style={{ marginLeft: 'auto' }}>Log out</button>
            </div>

            <div className="admin-tabs" role="tablist">
              {TABS.map(([key, label]) => (
                <button key={key} role="tab" aria-selected={tab === key}
                  className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'overview' && <Overview refreshKey={refreshKey} />}
            {tab === 'nominations' && <Nominations refreshKey={refreshKey} onChanged={bump} />}
            {tab === 'voters' && <Voters refreshKey={refreshKey} />}
            {tab === 'votes' && <Votes refreshKey={refreshKey} onChanged={bump} />}
            {tab === 'results' && <Results refreshKey={refreshKey} onChanged={bump} />}
            {tab === 'rsvp' && <Rsvp refreshKey={refreshKey} />}
            {tab === 'enquiries' && <Enquiries refreshKey={refreshKey} onChanged={bump} />}
            {tab === 'settings' && <Settings refreshKey={refreshKey} onChanged={bump} />}
            {tab === 'audit' && <Audit refreshKey={refreshKey} />}
          </>
        )}
      </div>
    </div>
  )
}
