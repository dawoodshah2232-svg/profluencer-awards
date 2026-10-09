import { useState } from 'react'
import { Btn, Card, Empty, PageIntro, Tag, errorText } from '../../components/AdminUI'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store } from '../../lib/store'

export default function Enquiries({ refreshKey, onChanged }) {
  const toast = useToast()
  const [tab, setTab] = useState('')
  const { data: list = [], reload, loading } = useAsync(() => Store.enquiries(), [refreshKey])
  const sorted = list.slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
  const unread = list.filter((e) => !e.read).length
  const shown = sorted.filter((e) => (tab === 'unread' ? !e.read : tab === 'sponsor' ? /sponsor/i.test(e.subject || '') : true))

  const markRead = async (e) => {
    try { await Store.markEnquiryRead(e.id) } catch (err) { toast(errorText(err)) }
    reload(); onChanged()
  }
  const remove = async (e) => {
    if (!window.confirm(`Delete the message from ${e.name}?`)) return
    try { await Store.deleteEnquiry(e.id); toast('Enquiry deleted') } catch (err) { toast(errorText(err)) }
    reload(); onChanged()
  }

  return (
    <>
      <PageIntro>Messages from the Contact page and sponsorship requests from the Sponsors page.</PageIntro>
      <div className="atool">
        <div className="seg">
          {[['', 'All', list.length], ['unread', 'Unread', unread], ['sponsor', 'Sponsorship', list.filter((e) => /sponsor/i.test(e.subject || '')).length]].map(([k, l, n]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}<em>{n}</em></button>
          ))}
        </div>
      </div>
      <Card>
        {shown.map((e) => (
          <div className="list-row" key={e.id} style={{ opacity: e.read ? 0.7 : 1 }}>
            <div className="grow">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <b>{e.name}</b>
                <a className="hint" href={`mailto:${e.email}`}>{e.email}</a>
                <span className="hint">· {Store.fmtTime(e.at)}</span>
                {!e.read && <Tag tone="gold">new</Tag>}
              </div>
              {e.subject && <div style={{ fontWeight: 700, marginTop: 6 }}>{e.subject}</div>}
              <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>{e.message}</p>
            </div>
            <div className="actions" style={{ display: 'flex', gap: 6 }}>
              {!e.read && <Btn size="sm" icon="check" onClick={() => markRead(e)}>Mark read</Btn>}
              <Btn size="sm" variant="danger" icon="trash" onClick={() => remove(e)} aria-label={`Delete message from ${e.name}`} />
            </div>
          </div>
        ))}
        {!shown.length && <Empty>{loading ? 'Loading…' : 'No enquiries here.'}</Empty>}
      </Card>
    </>
  )
}
