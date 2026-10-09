import { Btn, Card, PageIntro, Tag, errorText } from '../../components/AdminUI'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store } from '../../lib/store'

export default function Results({ refreshKey, onChanged }) {
  const toast = useToast()
  const { data: settings, reload } = useAsync(() => Store.settings(), [refreshKey])
  const { data: snapshot, reload: reloadSnap } = useAsync(() => Store.resultSnapshot(), [refreshKey])
  const { data: cats = [] } = useAsync(() => Store.categories(), [refreshKey])
  const { data: tops } = useAsync(async () => {
    const out = {}
    for (const c of await Store.categories()) out[c.id] = await Store.top5(c.id)
    return out
  }, [refreshKey])

  if (!settings) return <p className="hint">Loading results…</p>

  const after = () => { reload(); reloadSnap(); onChanged() }
  const publish = async () => {
    if (window.prompt('Type PUBLISH to freeze and publish results:') !== 'PUBLISH') return
    try { await Store.publishResults(); toast('Results published') } catch (e) { toast(errorText(e)) }
    after()
  }
  const unpublish = async () => {
    if (!window.confirm('Hide results from the public website?')) return
    try { await Store.unpublishResults(); toast('Results hidden') } catch (e) { toast(errorText(e)) }
    after()
  }

  return (
    <>
      <PageIntro>
        Results stay hidden until you publish. Publishing freezes a versioned snapshot: rank 1 becomes Category Winner, ranks 2–5 become Top 5 Honourees. Ties break by votes, then earliest last vote, then earliest approval.
      </PageIntro>
      <Card title="Publication" right={settings.resultsPublished
        ? <Btn onClick={unpublish}>Unpublish results</Btn>
        : <Btn variant="primary" icon="trophy" onClick={publish}>Publish results</Btn>}>
        <p>
          Status: <Tag>{settings.resultsPublished ? 'published' : 'draft'}</Tag>
          {snapshot && snapshot.version ? <span className="hint"> &nbsp;Snapshot v{snapshot.version}{snapshot.at ? ` · ${new Date(snapshot.at).toLocaleString()}` : ''}</span> : null}
        </p>
        <p className="tier-note">Process rule: results publication needs two-person approval before you type PUBLISH.</p>
      </Card>

      <div className="agrid two">
        {cats.map((c) => (
          <Card title={c.name} key={c.id} sub="Live ranking (provisional until published)">
            {(tops && tops[c.id] && tops[c.id].length) ? tops[c.id].map((x, i) => (
              <div className="list-row" key={x.id} style={{ alignItems: 'center', padding: '10px 0' }}>
                <div className={`rank${i === 0 ? ' r1' : ''}`}>{i + 1}</div>
                <div className="grow"><b>{x.name}</b><div className="hint">{[x.handle, i === 0 ? 'Category Winner' : 'Top 5 Honouree'].filter(Boolean).join(' · ')}</div></div>
                <b style={{ color: 'var(--gold-lt)' }}>{Store.fmt(x.votes || 0)}</b>
              </div>
            )) : <p className="hint">No approved nominees yet.</p>}
          </Card>
        ))}
      </div>
    </>
  )
}
