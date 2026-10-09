import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Btn, Card, PageIntro, StatCard, Tag, errorText } from '../../components/AdminUI'
import { Avatar } from '../../components/ui'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store } from '../../lib/store'
import { assetUrl } from '../../lib/assets'

/* Winner confirmation. For each category the admin sees every approved
   nominee's vote breakdown (counted / held / invalidated), confirms the
   winners in rank order (pre-filled with the top N by counted votes, or the
   last published list), then publishes the result snapshot. */
export default function Results({ refreshKey, onChanged }) {
  const toast = useToast()
  const { data, reload, loading, error } = useAsync(() => Store.standings(), [refreshKey])
  const [picks, setPicks] = useState(null) // { [catId]: [nomineeId, ...] }
  const [busy, setBusy] = useState(false)
  const n = (data && data.awards_per_category) || 5

  useEffect(() => {
    if (!data) return
    const init = {}
    for (const c of data.categories) {
      init[c.category_id] = c.published && c.published.length ? c.published.filter((id) => c.nominees.some((x) => x.id === id)) : c.nominees.slice(0, n).map((x) => x.id)
    }
    setPicks(init)
  }, [data, n])

  if (error) return <Card><p className="hint">{errorText(error, 'Could not load standings.')}</p></Card>
  if (loading || !data || !picks) return <p className="hint">Loading standings…</p>

  const totals = data.categories.reduce((o, c) => {
    c.nominees.forEach((x) => { o.counted += x.votes_count; o.held += x.held; o.invalid += x.invalidated })
    return o
  }, { counted: 0, held: 0, invalid: 0 })

  const move = (catId, i, dir) => setPicks((p) => {
    const list = p[catId].slice()
    const j = i + dir
    if (j < 0 || j >= list.length) return p
    ;[list[i], list[j]] = [list[j], list[i]]
    return { ...p, [catId]: list }
  })
  const toggle = (catId, id) => setPicks((p) => {
    const list = p[catId] || []
    if (list.includes(id)) return { ...p, [catId]: list.filter((x) => x !== id) }
    if (list.length >= n) { toast(`Up to ${n} winners per category`); return p }
    return { ...p, [catId]: [...list, id] }
  })
  const resetToVotes = () => setPicks(Object.fromEntries(data.categories.map((c) => [c.category_id, c.nominees.slice(0, n).map((x) => x.id)])))

  const publish = async () => {
    if (window.prompt('Type PUBLISH to confirm these winners and publish the results to the website:') !== 'PUBLISH') return
    setBusy(true)
    try {
      await Store.publishResults(picks)
      toast('Winners published — the website now shows the results')
      reload(); onChanged()
    } catch (e) { toast(errorText(e)) } finally { setBusy(false) }
  }
  const unpublish = async () => {
    if (!window.confirm('Hide the results from the public website?')) return
    try { await Store.unpublishResults(); toast('Results hidden') } catch (e) { toast(errorText(e)) }
    reload(); onChanged()
  }

  return (
    <>
      <PageIntro right={<>
        <Btn icon="refresh" onClick={resetToVotes}>Reset to vote order</Btn>
        {data.results_published && <Btn onClick={unpublish}>Unpublish</Btn>}
        <Btn variant="primary" icon="trophy" onClick={publish} disabled={busy}>{data.results_published ? 'Republish winners' : 'Publish winners'}</Btn>
      </>}>
        Check each category&rsquo;s votes, invalidate anything suspicious on the <Link to="/admin/votes" style={{ color: 'var(--gold-lt)' }}>Votes</Link> page, then confirm the winners. Rank 1 becomes Category Winner, ranks 2–{n} Top {n} Honourees. Publishing freezes a versioned snapshot shown on the Winners page and leaderboard.
      </PageIntro>

      <div className="stat-grid">
        <StatCard icon="trophy" tone={data.results_published ? 'green' : ''} value={data.results_published ? 'PUBLISHED' : 'DRAFT'} label="Results status" sub={data.snapshot_version ? `snapshot v${data.snapshot_version}${data.published_at ? ` · ${Store.fmtTime(data.published_at)}` : ''}` : 'nothing published yet'} />
        <StatCard icon="badge" tone="green" value={Store.fmt(totals.counted)} label="Counted votes" sub="decide the default ranking" />
        <StatCard icon="refresh" value={Store.fmt(totals.held)} label="Held (unverified)" sub="never count" />
        <StatCard icon="shield" tone="rose" value={Store.fmt(totals.invalid)} label="Invalidated" sub="excluded after review" />
      </div>

      <div className="agrid two">
        {data.categories.map((c) => {
          const chosen = picks[c.category_id] || []
          const byId = Object.fromEntries(c.nominees.map((x) => [x.id, x]))
          const voteOrder = c.nominees.slice(0, n).map((x) => x.id)
          const differs = chosen.join(',') !== voteOrder.join(',')
          return (
            <Card key={c.category_id} title={c.category_name}
              sub={`${c.nominees.length} approved nominees · ${Store.fmt(c.nominees.reduce((a, x) => a + x.votes_count, 0))} counted votes`}
              right={differs ? <Tag tone="amber">admin order</Tag> : <Tag tone="green">by votes</Tag>}>
              <div className="hint" style={{ marginBottom: 6 }}>Confirmed winners</div>
              {chosen.map((id, i) => {
                const x = byId[id]
                if (!x) return null
                return (
                  <div className="list-row" key={id} style={{ alignItems: 'center', padding: '8px 0' }}>
                    <div className={`rank${i === 0 ? ' r1' : ''}`}>{i + 1}</div>
                    <Avatar name={x.name} photo={assetUrl(x.photo_url)} size={34} />
                    <div className="grow"><b>{x.name}</b><div className="hint">{i === 0 ? 'Category Winner' : `Top ${n} Honouree`} · {Store.fmt(x.votes_count)} votes</div></div>
                    <Btn size="sm" onClick={() => move(c.category_id, i, -1)} disabled={i === 0} aria-label="Move up">Up</Btn>
                    <Btn size="sm" onClick={() => move(c.category_id, i, 1)} disabled={i === chosen.length - 1} aria-label="Move down">Down</Btn>
                  </div>
                )
              })}
              {!chosen.length && <p className="hint">No winners selected.</p>}

              <div className="hint" style={{ margin: '14px 0 6px' }}>All nominees — vote verification</div>
              <div className="atable-wrap">
                <table className="atable">
                  <thead><tr><th>Pick</th><th>Nominee</th><th style={{ textAlign: 'right' }}>Counted</th><th style={{ textAlign: 'right' }}>Held</th><th style={{ textAlign: 'right' }}>Invalid</th></tr></thead>
                  <tbody>
                    {c.nominees.map((x) => (
                      <tr key={x.id}>
                        <td className="checkcell"><input type="checkbox" checked={chosen.includes(x.id)} onChange={() => toggle(c.category_id, x.id)} aria-label={`Select ${x.name}`} /></td>
                        <td><b>{x.name}</b><div className="muted">{x.handle || ''}</div></td>
                        <td className="num">{Store.fmt(x.votes_count)}</td>
                        <td className="muted" style={{ textAlign: 'right' }}>{x.held}</td>
                        <td style={{ textAlign: 'right', color: x.invalidated ? '#fca5a5' : 'var(--muted)' }}>{x.invalidated}</td>
                      </tr>
                    ))}
                    {!c.nominees.length && <tr><td colSpan="5" className="empty">No approved nominees.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
