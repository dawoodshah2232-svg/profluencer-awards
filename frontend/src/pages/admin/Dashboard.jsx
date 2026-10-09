import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HBars, VBarChart } from '../../components/Charts'
import { Card, StatCard, Tag } from '../../components/AdminUI'
import { useAsync } from '../../lib/hooks'
import { Store, getMode } from '../../lib/store'
import { shortDate, shortDateYear, useDates } from '../../lib/dates'

export default function Dashboard({ refreshKey }) {
  const dates = useDates()
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

  if (!settings) return <p className="hint">Loading dashboard…</p>

  const window_ = `${shortDate(dates.votingStart)} – ${shortDate(dates.votingEnd)}`
  const cer = `${shortDateYear(dates.ceremonyDate)} · ${dates.ceremonyCity}`
  const steps = state === 'upcoming'
    ? [['Nominations', 'Collecting profiles', 'now'], ['Voting', window_, ''], ['Verification', 'Fraud review', ''], ['Ceremony', cer, '']]
    : state === 'open'
      ? [['Nominations', 'Complete', 'done'], ['Voting', window_, 'now'], ['Verification', 'After close', ''], ['Ceremony', cer, '']]
      : [['Nominations', 'Complete', 'done'], ['Voting', `Closed ${shortDate(dates.votingEnd)}`, 'done'], ['Verification', settings.resultsPublished ? 'Complete' : 'In review', settings.resultsPublished ? 'done' : 'now'], ['Ceremony', cer, settings.resultsPublished ? 'now' : '']]

  const hsum = perHour.reduce((a, b) => a + b, 0)
  const hmax = Math.max(0, ...perHour)
  const spike = hsum > 0 && hmax > Math.max(12, (hsum / 24) * 4)
  const catRows = cats.map((c) => ({ label: c.name, value: byCat[c.id] || 0, display: Store.fmt(byCat[c.id] || 0) }))
    .sort((a, b) => b.value - a.value)
  const pending = (byStatus.pending || 0) + (byStatus.submitted || 0)
  const recent = all.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 6)

  return (
    <>
      <Card title="Edition timeline" sub={`Voting ${window_}, ${String(dates.votingEnd).slice(0, 4)} · Ceremony ${cer}`}>
        <div className="timeline">
          {steps.map((s) => (
            <div className={`tstep ${s[2]}`} key={s[0]}><b>{s[0]}</b><small>{s[1]}</small></div>
          ))}
        </div>
      </Card>

      <div className="stat-grid">
        <StatCard icon="users" value={all.length} label="Nominees total" sub={`${pending} awaiting review`} />
        <StatCard icon="badge" tone="green" value={byStatus.approved || 0} label="Approved nominees" sub={`across ${cats.length} categories`} />
        <StatCard icon="chart" tone="blue" value={Store.fmt(voterStats ? voterStats.counted : 0)} label="Votes counted" sub="verified & valid" />
        <StatCard icon="user" tone="blue" value={Store.fmt(voterStats ? voterStats.total : 0)} label="Registered voters" sub="unique email + phone" />
        <StatCard icon="shield" tone="rose" value={Store.fmt(blocked)} label="Duplicates blocked" sub="same email/phone, same category" />
        <StatCard icon="calendar" value={rsvps.length} label="Ceremony RSVPs" sub={`${rsvps.filter((r) => r.checkedIn).length} checked in`} />
        <StatCard icon="inbox" value={enqs.filter((e) => !e.read).length} label="Unread enquiries" sub={`${enqs.length} total`} />
        <StatCard icon="trophy" tone={settings.resultsPublished ? 'green' : ''} value={settings.resultsPublished ? 'LIVE' : 'HIDDEN'} label="Results" sub={settings.resultsPublished ? 'published to the site' : 'not published yet'} />
      </div>

      {spike ? (
        <div className="alert warn"><b>Unusual voting spike detected.</b> One hour in the last 24 saw {hmax} votes vs an hourly average of {(hsum / 24).toFixed(1)}. Review the Votes page before publishing results.</div>
      ) : (
        <div className="alert ok"><b>Integrity looks healthy.</b> No abnormal hourly spikes in the last 24 hours. {blocked} duplicate-vote attempts blocked so far.</div>
      )}
      {getMode() === 'demo' && (
        <div className="alert info"><b>Demo mode.</b> Figures come from seeded sample data in this browser — not real nominees or votes.</div>
      )}

      <div className="agrid wide">
        <Card title="Votes per day" sub="Last 14 days">
          <VBarChart data={perDay} highlightLast />
          <div className="vchart-legend"><span>14 days ago</span><span>Today</span></div>
        </Card>
        <Card title="Nominees by status">
          {['pending', 'approved', 'changes_requested', 'rejected'].map((k) => (
            <div className="list-row" key={k} style={{ alignItems: 'center', padding: '10px 0' }}>
              <div className="grow"><Tag>{k}</Tag></div>
              <b>{byStatus[k] || 0}</b>
            </div>
          ))}
          <Link className="abtn sm" to="/admin/nominees" style={{ marginTop: 10 }}>Review nominees</Link>
        </Card>
      </div>

      <div className="agrid two">
        <Card title="Votes by category">
          <HBars rows={catRows} />
        </Card>
        <Card title="Recent activity" right={<Link className="abtn sm" to="/admin/audit">Audit log</Link>}>
          {feed.length ? feed.map((a, i) => (
            <div className="feed-item" key={i}>
              <time>{Store.fmtTime(a.at)}</time>
              <div><code>{a.action}</code> <span style={{ color: 'var(--muted)' }}>· {a.actor}{a.detail ? ` · ${a.detail}` : ''}</span></div>
            </div>
          )) : <p className="hint">No activity yet.</p>}
        </Card>
      </div>

      <Card title="Latest nominees" flush right={<Link className="abtn sm" to="/admin/nominees">View all</Link>}>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr><th>Nominee</th><th>Category</th><th>Status</th><th style={{ textAlign: 'right' }}>Votes</th></tr></thead>
            <tbody>
              {recent.map((x) => (
                <tr key={x.id}>
                  <td><b>{x.name}</b><div className="muted">{[x.handle, x.platform].filter(Boolean).join(' · ')}</div></td>
                  <td className="muted">{(cats.find((c) => c.id === x.categoryId) || {}).name || ''}</td>
                  <td><Tag>{x.status}</Tag></td>
                  <td className="num">{Store.fmt(x.votes || 0)}</td>
                </tr>
              ))}
              {!recent.length && <tr><td colSpan="4" className="empty">No nominees yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
