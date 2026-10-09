import { useState } from 'react'
import { HourlyBars, VBarChart } from '../../components/Charts'
import { Btn, Card, PageIntro, SearchBox, StatCard, Tag, errorText } from '../../components/AdminUI'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store } from '../../lib/store'
import { downloadBlob, downloadCSV } from './csv'

async function exportVotes(toast) {
  try {
    const blob = await Store.exportCsv('votes')
    if (blob) { downloadBlob('votes.csv', blob); return }
    const rows = [['id', 'time', 'nominee', 'category', 'status', 'reason']]
    for (const v of await Store.recentVotes(5000)) rows.push([v.id, new Date(v.at).toISOString(), v.nomineeName || v.nomineeId, v.categoryName || v.categoryId, v.status, v.reason || ''])
    downloadCSV('votes.csv', rows)
    toast('Votes exported')
  } catch (e) { toast(errorText(e)) }
}

export function Votes({ refreshKey, onChanged }) {
  const toast = useToast()
  const [fstatus, setFstatus] = useState('')
  const [q, setQ] = useState('')
  const { data: perHour = [] } = useAsync(() => Store.votesPerHour(24), [refreshKey])
  const { data: cats = [] } = useAsync(() => Store.categories(), [refreshKey])
  const { data: all = [], reload, loading } = useAsync(() => Store.recentVotes(500), [refreshKey])
  const { data: nameMap = {} } = useAsync(async () => {
    const m = {}
    ;(await Store.approved()).forEach((x) => { m[x.id] = x.name })
    return m
  }, [refreshKey])

  const catName = (id) => (cats.find((c) => String(c.id) === String(id)) || {}).name || id
  const nominee = (v) => v.nomineeName || nameMap[v.nomineeId] || '(removed)'
  const term = q.trim().toLowerCase()
  const filtered = all.filter((v) => (!fstatus || v.status === fstatus)
    && (!term || [nominee(v), v.voterName, v.voterEmail, catName(v.categoryId)].join(' ').toLowerCase().includes(term)))
  const counts = all.reduce((o, v) => { o[v.status] = (o[v.status] || 0) + 1; return o }, {})

  const invalidate = async (v) => {
    const reason = window.prompt('Reason for invalidating this vote (min 5 characters):')
    if (reason === null) return
    try { await Store.invalidateVote(v.id, reason); toast('Vote invalidated') } catch (e) { toast(errorText(e)) }
    reload(); onChanged()
  }

  return (
    <>
      <PageIntro right={<Btn icon="download" onClick={() => exportVotes(toast)}>Export CSV</Btn>}>
        Every vote cast. Votes are never edited or deleted — invalidate suspicious votes and totals recalculate automatically. Each action is audit-logged.
      </PageIntro>
      <div className="stat-grid">
        <StatCard icon="badge" tone="green" value={Store.fmt(counts.counted || 0)} label="Counted" sub="in the latest 500" />
        <StatCard icon="refresh" value={Store.fmt(counts.held || 0)} label="Held" sub="awaiting email code" />
        <StatCard icon="shield" tone="rose" value={Store.fmt(counts.invalidated || 0)} label="Invalidated" sub="excluded from totals" />
        <StatCard icon="chart" tone="blue" value={Store.fmt(perHour.reduce((a, b) => a + b, 0))} label="Last 24 hours" sub="counted votes" />
      </div>
      <Card title="Voting velocity" sub="Counted votes per hour, last 24 hours. Sudden spikes can indicate coordinated voting.">
        <HourlyBars data={perHour} />
        <div className="vchart-legend"><span>24h ago</span><span>Now</span></div>
      </Card>
      <div className="atool">
        <SearchBox value={q} onChange={setQ} placeholder="Search nominee, voter, category…" />
        <select className="ainput" value={fstatus} onChange={(e) => setFstatus(e.target.value)}>
          <option value="">All statuses</option>
          {['counted', 'held', 'invalidated'].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <Card flush>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr><th>Time</th><th>Nominee</th><th>Category</th><th>Voter</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {filtered.slice(0, 200).map((v) => (
                <tr key={v.id}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{Store.fmtTime(v.at)}</td>
                  <td><b>{nominee(v)}</b></td>
                  <td className="muted">{v.categoryName || catName(v.categoryId)}</td>
                  <td className="muted">{v.voterName || `…${String(v.voterId || '').slice(-6)}`}{v.voterEmail ? <><br />{v.voterEmail}</> : null}</td>
                  <td><Tag>{v.status}</Tag>{v.reason && <div className="muted">{v.reason}</div>}</td>
                  <td><div className="actions">{v.status !== 'invalidated'
                    ? <Btn size="sm" variant="danger" onClick={() => invalidate(v)}>Invalidate</Btn>
                    : <span className="muted">—</span>}</div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="6" className="empty">{loading ? 'Loading votes…' : 'No votes match.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

export function Voters({ refreshKey }) {
  const { data: st } = useAsync(() => Store.voterStats(), [refreshKey])
  const { data: perDay = [] } = useAsync(() => Store.newVotersPerDay(7), [refreshKey])
  const { data: blocked = 0 } = useAsync(() => Store.blockedAttempts(), [refreshKey])
  if (!st) return <p className="hint">Loading voters…</p>
  return (
    <>
      <PageIntro>One identity (email + phone) can vote once in each category. Voter contact details are used only for verification.</PageIntro>
      <div className="stat-grid">
        <StatCard icon="users" value={Store.fmt(st.total)} label="Registered voters" sub="unique email + phone identities" />
        <StatCard icon="badge" tone="green" value={Store.fmt(st.counted)} label="Votes counted" sub="across all categories" />
        <StatCard icon="chart" tone="blue" value={Number(st.avg || 0).toFixed(1)} label="Avg votes per voter" sub="max possible: one per category" />
        <StatCard icon="grid" value={Store.fmt(st.multi)} label="Multi-category voters" sub="voted in 2+ categories" />
        <StatCard icon="user" tone="blue" value={Store.fmt(st.today)} label="New voters today" sub="first-time identities" />
        <StatCard icon="shield" tone="rose" value={Store.fmt(blocked)} label="Duplicates blocked" sub="repeat email/phone per category" />
      </div>
      <Card title="New voters per day" sub="Last 7 days">
        <VBarChart data={perDay} highlightLast small />
        <div className="vchart-legend"><span>7 days ago</span><span>Today</span></div>
      </Card>
    </>
  )
}
