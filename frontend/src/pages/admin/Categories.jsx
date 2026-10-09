import { useState } from 'react'
import { Btn, Card, Modal, PageIntro, errorText } from '../../components/AdminUI'
import { Field } from '../../components/ui'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store } from '../../lib/store'
import { assetUrl } from '../../lib/assets'

function CategoryForm({ cat, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({
    name: cat?.name || '',
    tagline: cat?.tagline || '',
    description: cat?.description || '',
    image_url: cat?.image_url || '',
    sort_order: cat?.sort_order ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const save = async () => {
    setErr('')
    if (f.name.trim().length < 2) { setErr('Enter a category name.'); return }
    setBusy(true)
    try {
      await Store.saveCategory(cat ? cat.id : null, {
        name: f.name.trim(),
        tagline: f.tagline.trim() || null,
        description: f.description.trim() || null,
        image_url: f.image_url.trim() || null,
        sort_order: f.sort_order === '' ? null : Number(f.sort_order),
      })
      toast(cat ? 'Category updated' : 'Category created')
      onSaved()
    } catch (e) { setErr(errorText(e)) } finally { setBusy(false) }
  }

  return (
    <Modal title={cat ? `Edit ${cat.name}` : 'Add category'} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save category'}</Btn></>}>
      <div className={`form-error${err ? ' show' : ''}`}>{err}</div>
      <Field label="Name *"><input value={f.name} onChange={set('name')} /></Field>
      <Field label="Tagline" hint="Short line shown on the category card"><input value={f.tagline} onChange={set('tagline')} /></Field>
      <Field label="Description"><textarea value={f.description} onChange={set('description')} rows="3" /></Field>
      <div className="form-grid">
        <Field label="Image URL" hint="https:// link or site path (img/cat-tech.jpg). Empty = default artwork."><input value={f.image_url} onChange={set('image_url')} /></Field>
        <Field label="Sort order" hint="Lower numbers show first"><input type="number" min="0" max="127" value={f.sort_order} onChange={set('sort_order')} /></Field>
      </div>
    </Modal>
  )
}

export default function Categories({ refreshKey, onChanged }) {
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const { data: cats = [], reload, loading } = useAsync(() => Store.adminCategories(), [refreshKey])

  const remove = async (c) => {
    if (!window.confirm(`Delete the category "${c.name}"? Only empty categories (no nominees, no votes) can be deleted.`)) return
    try { await Store.deleteCategory(c.id); toast('Category deleted') } catch (e) { toast(errorText(e)) }
    reload(); onChanged()
  }

  return (
    <>
      <PageIntro right={<Btn variant="primary" icon="plus" onClick={() => setEditing('new')}>Add category</Btn>}>
        The award categories shown on the website. Each category honours its top 5 nominees. Rename, re-order, change artwork, or add new categories.
      </PageIntro>
      <Card flush>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr><th>#</th><th>Category</th><th>Tagline</th><th style={{ textAlign: 'right' }}>Nominees</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td className="muted">{c.sort_order}</td>
                  <td>
                    <div className="cell-user">
                      {c.img ? <img className="thumb" src={assetUrl(c.img)} alt="" /> : null}
                      <div><b>{c.name}</b><div className="muted">/{c.slug}</div></div>
                    </div>
                  </td>
                  <td className="muted" style={{ maxWidth: 360 }}>{c.tagline || c.description || '—'}</td>
                  <td className="num">{c.nominees_count ?? '—'}</td>
                  <td>
                    <div className="actions">
                      <Btn size="sm" icon="pencil" onClick={() => setEditing(c)}>Edit</Btn>
                      <Btn size="sm" variant="danger" icon="trash" onClick={() => remove(c)} aria-label={`Delete ${c.name}`} />
                    </div>
                  </td>
                </tr>
              ))}
              {!cats.length && <tr><td colSpan="5" className="empty">{loading ? 'Loading…' : 'No categories yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && <CategoryForm cat={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); onChanged() }} />}
    </>
  )
}
