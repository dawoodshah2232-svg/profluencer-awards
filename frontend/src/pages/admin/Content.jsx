import { useState } from 'react'
import { Btn, Card, Empty, Modal, PageIntro, Tag, errorText } from '../../components/AdminUI'
import { Field } from '../../components/ui'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store } from '../../lib/store'
import { assetUrl } from '../../lib/assets'

/* One manager for every admin-editable content type on the website.
   Field kinds: text | textarea | html | number | check. Keys starting with
   "meta." are stored in the row's meta object. */
const TYPES = {
  news: {
    noun: 'article',
    intro: 'Articles on the News & Insights page. Body is HTML (paragraphs, headings, lists, links).',
    fields: [
      { key: 'title', label: 'Headline *', span: 2 },
      { key: 'subtitle', label: 'Excerpt', kind: 'textarea', span: 2, hint: 'Shown on the news card' },
      { key: 'meta.date', label: 'Date label', hint: 'e.g. 5 October 2026' },
      { key: 'meta.tag', label: 'Tag', hint: 'e.g. Industry' },
      { key: 'image_url', label: 'Cover image URL', hint: 'https:// link or site path (img/hero.jpg)' },
      { key: 'meta.alt', label: 'Image description (alt text)' },
      { key: 'meta.read', label: 'Read time', hint: 'e.g. 6 min read' },
      { key: 'slug', label: 'URL slug', hint: 'Empty = made from the headline' },
      { key: 'body', label: 'Article body (HTML)', kind: 'html', span: 2 },
    ],
  },
  sponsor_tier: {
    noun: 'sponsorship tier',
    intro: 'Partnership tiers listed on the Sponsors page and in its request form.',
    fields: [
      { key: 'title', label: 'Tier name *', span: 2 },
      { key: 'body', label: 'Description', kind: 'textarea', span: 2 },
    ],
  },
  faq: {
    noun: 'question',
    intro: 'Questions on the FAQ page. Tick "Show on home page" to feature a question on the home page too.',
    fields: [
      { key: 'title', label: 'Question *', span: 2 },
      { key: 'body', label: 'Answer', kind: 'textarea', span: 2 },
      { key: 'meta.home', label: 'Show on home page', kind: 'check' },
    ],
  },
}

const getVal = (row, key) => (key.startsWith('meta.') ? (row.meta || {})[key.slice(5)] : row[key])

function ContentForm({ type, row, onClose, onSaved }) {
  const toast = useToast()
  const cfg = TYPES[type]
  const [f, setF] = useState(() => {
    const o = { sort_order: row?.sort_order ?? '', is_published: row ? !!row.is_published : true }
    cfg.fields.forEach((fd) => { const v = row ? getVal(row, fd.key) : undefined; o[fd.key] = fd.kind === 'check' ? !!v : (v ?? '') })
    return o
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const save = async () => {
    setErr('')
    if (String(f.title || '').trim().length < 2) { setErr(`Enter the ${cfg.fields[0].label.replace(' *', '').toLowerCase()}.`); return }
    const body = { meta: { ...(row?.meta || {}) }, is_published: !!f.is_published, sort_order: f.sort_order === '' ? null : Number(f.sort_order) }
    if (!row) body.type = type
    cfg.fields.forEach((fd) => {
      let v = f[fd.key]
      if (fd.kind !== 'check') v = String(v ?? '').trim() || null
      if (fd.key.startsWith('meta.')) body.meta[fd.key.slice(5)] = v
      else body[fd.key] = v
    })
    setBusy(true)
    try {
      await Store.saveContent(row ? row.id : null, body)
      toast(row ? 'Saved' : `New ${cfg.noun} added`)
      onSaved()
    } catch (e) { setErr(errorText(e)) } finally { setBusy(false) }
  }

  return (
    <Modal title={row ? `Edit ${cfg.noun}` : `Add ${cfg.noun}`} onClose={onClose} wide={type === 'news'}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn></>}>
      <div className={`form-error${err ? ' show' : ''}`}>{err}</div>
      <div className="form-grid">
        {cfg.fields.map((fd) => (
          <div key={fd.key} className={fd.span === 2 ? 'span2' : ''}>
            {fd.kind === 'check' ? (
              <label className="acheck"><input type="checkbox" checked={!!f[fd.key]} onChange={(e) => set(fd.key, e.target.checked)} />{fd.label}</label>
            ) : (
              <Field label={fd.label} hint={fd.hint}>
                {fd.kind === 'textarea' || fd.kind === 'html'
                  ? <textarea className={fd.kind === 'html' ? 'code' : ''} value={f[fd.key]} onChange={(e) => set(fd.key, e.target.value)} rows={fd.kind === 'html' ? 14 : 4} />
                  : <input value={f[fd.key]} onChange={(e) => set(fd.key, e.target.value)} />}
              </Field>
            )}
          </div>
        ))}
        <Field label="Sort order" hint="Lower numbers show first"><input type="number" min="0" value={f.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Field>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label className="acheck"><input type="checkbox" checked={!!f.is_published} onChange={(e) => set('is_published', e.target.checked)} />Published on the website</label>
        </div>
      </div>
    </Modal>
  )
}

export default function ContentManager({ type, refreshKey }) {
  const toast = useToast()
  const cfg = TYPES[type]
  const [editing, setEditing] = useState(null)
  const { data: rows = [], reload, loading } = useAsync(() => Store.adminContent(type), [type, refreshKey])

  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.title}"? This removes it from the website.`)) return
    try { await Store.deleteContent(r.id); toast('Deleted') } catch (e) { toast(errorText(e)) }
    reload()
  }
  const togglePublish = async (r) => {
    try { await Store.saveContent(r.id, { is_published: !r.is_published }); toast(r.is_published ? 'Hidden from the website' : 'Published') } catch (e) { toast(errorText(e)) }
    reload()
  }

  return (
    <>
      <PageIntro right={<Btn variant="primary" icon="plus" onClick={() => setEditing('new')}>Add {cfg.noun}</Btn>}>{cfg.intro}</PageIntro>
      <Card flush>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr><th>#</th><th>{type === 'faq' ? 'Question' : type === 'news' ? 'Article' : 'Tier'}</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="muted">{r.sort_order}</td>
                  <td>
                    <div className="cell-user" style={{ minWidth: 260 }}>
                      {type === 'news' && r.img ? <img className="thumb" src={assetUrl(r.img)} alt="" /> : null}
                      <div>
                        <b>{r.title}</b>
                        <div className="muted" style={{ maxWidth: 620, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {type === 'news' ? [r.date, r.tag, `/news/${r.slug}`].filter(Boolean).join(' · ') : r.body}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Tag>{r.is_published ? 'published' : 'draft'}</Tag>
                    {type === 'faq' && r.meta && r.meta.home ? <> <Tag tone="gold">home</Tag></> : null}
                  </td>
                  <td><div className="actions">
                    <Btn size="sm" icon="eye" onClick={() => togglePublish(r)}>{r.is_published ? 'Hide' : 'Publish'}</Btn>
                    <Btn size="sm" icon="pencil" onClick={() => setEditing(r)}>Edit</Btn>
                    <Btn size="sm" variant="danger" icon="trash" onClick={() => remove(r)} aria-label={`Delete ${r.title}`} />
                  </div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="4"><Empty icon="news">{loading ? 'Loading…' : `No ${cfg.noun}s yet.`}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && <ContentForm type={type} row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </>
  )
}
