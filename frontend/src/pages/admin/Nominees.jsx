import { useMemo, useState } from 'react'
import { Btn, Card, Modal, PageIntro, SearchBox, Tag, errorText } from '../../components/AdminUI'
import { Avatar, Field } from '../../components/ui'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store } from '../../lib/store'
import { assetUrl } from '../../lib/assets'

const STATUSES = ['pending', 'approved', 'changes_requested', 'rejected']
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Snapchat', 'X', 'Facebook', 'LinkedIn', 'Other']
const isPending = (s) => s === 'pending' || s === 'submitted'

function NomineeForm({ nominee, cats, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(() => ({
    name: nominee?.name || '',
    category_id: nominee?.categoryId ?? (cats[0] && cats[0].id) ?? '',
    handle: nominee?.handle || '',
    platform: nominee?.platform || 'Instagram',
    profile_url: nominee?.profile_url || '',
    photo_url: nominee?.photo_url || nominee?.photo || '',
    bio: nominee?.bio || '',
    mobile: nominee?.mobile || '',
    country: nominee?.country || '',
    city: nominee?.city || '',
    status: nominee ? (isPending(nominee.status) ? 'pending' : nominee.status) : 'approved',
  }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const save = async () => {
    setErr('')
    if (f.name.trim().length < 2) { setErr('Enter the nominee name.'); return }
    setBusy(true)
    try {
      const body = { ...f, category_id: Number(f.category_id) }
      for (const k of ['handle', 'profile_url', 'photo_url', 'bio', 'mobile', 'country', 'city']) if (!body[k]) body[k] = null
      await Store.saveNominee(nominee ? nominee.id : null, body)
      toast(nominee ? 'Nominee updated' : 'Nominee created')
      onSaved()
    } catch (e) {
      setErr(errorText(e))
    } finally { setBusy(false) }
  }

  return (
    <Modal title={nominee ? `Edit ${nominee.name}` : 'Add nominee'} onClose={onClose} wide
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save nominee'}</Btn></>}>
      <div className={`form-error${err ? ' show' : ''}`}>{err}</div>
      <div className="form-grid">
        <Field label="Display name *"><input value={f.name} onChange={set('name')} /></Field>
        <Field label="Category *">
          <select value={f.category_id} onChange={set('category_id')}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Handle"><input value={f.handle} onChange={set('handle')} placeholder="@handle" /></Field>
        <Field label="Main platform">
          <select value={f.platform} onChange={set('platform')}>
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Profile URL"><input value={f.profile_url} onChange={set('profile_url')} placeholder="https://instagram.com/…" /></Field>
        <Field label="Photo URL" hint="Full https:// link, or a site path like img/photo.jpg"><input value={f.photo_url} onChange={set('photo_url')} /></Field>
        <Field label="Mobile"><input value={f.mobile} onChange={set('mobile')} /></Field>
        <Field label="Status">
          <select value={f.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field label="Country"><input value={f.country} onChange={set('country')} /></Field>
        <Field label="City"><input value={f.city} onChange={set('city')} /></Field>
        <div className="span2"><Field label="Bio"><textarea value={f.bio} onChange={set('bio')} rows="4" /></Field></div>
      </div>
    </Modal>
  )
}

export default function Nominees({ refreshKey, onChanged }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('')
  const [fcat, setFcat] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [editing, setEditing] = useState(null) // null | 'new' | nominee
  const { data: cats = [] } = useAsync(() => Store.categories(), [refreshKey])
  const { data: all = [], reload, loading } = useAsync(() => Store.allNominees(), [refreshKey])

  const counts = useMemo(() => {
    const o = { '': all.length }
    all.forEach((x) => { const k = isPending(x.status) ? 'pending' : x.status; o[k] = (o[k] || 0) + 1 })
    return o
  }, [all])

  const filtered = all.filter((x) => {
    if (tab && (isPending(x.status) ? 'pending' : x.status) !== tab) return false
    if (fcat && String(x.categoryId) !== String(fcat)) return false
    const term = q.trim().toLowerCase()
    if (term && [x.name, x.handle, x.email, x.city].join(' ').toLowerCase().indexOf(term) === -1) return false
    return true
  })
  const catName = (id) => (cats.find((c) => String(c.id) === String(id)) || {}).name || ''

  const refresh = () => { setSelected(new Set()); reload(); onChanged() }
  const setStatus = async (ids, status) => {
    try {
      for (const id of ids) await Store.setNominationStatus(id, status)
      toast(ids.length > 1 ? `${ids.length} nominees updated` : `Nominee ${status.replace(/_/g, ' ')}`)
    } catch (e) { toast(errorText(e)) }
    refresh()
  }
  const remove = async (x) => {
    if (!window.confirm(`Delete ${x.name}? This cannot be undone. Nominees with votes cannot be deleted — reject them instead.`)) return
    try { await Store.removeNomination(x.id); toast('Nominee deleted') } catch (e) { toast(errorText(e)) }
    refresh()
  }
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = (e) => setSelected(e.target.checked ? new Set(filtered.map((x) => x.id)) : new Set())

  return (
    <>
      <PageIntro right={<Btn variant="primary" icon="plus" onClick={() => setEditing('new')}>Add nominee</Btn>}>
        Every influencer profile on the site. Approve self-nominations, edit any profile, or add nominees directly. Only approved nominees appear publicly and can receive votes.
      </PageIntro>

      <div className="atool">
        <div className="seg">
          {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['changes_requested', 'Changes'], ['rejected', 'Rejected']].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}<em>{counts[k] || 0}</em></button>
          ))}
        </div>
      </div>
      <div className="atool">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, handle, email, city…" />
        <select className="ainput" value={fcat} onChange={(e) => setFcat(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="atool">
          <span className="hint">{selected.size} selected</span>
          <Btn size="sm" variant="ok" icon="check" onClick={() => setStatus([...selected], 'approved')}>Approve</Btn>
          <Btn size="sm" onClick={() => setStatus([...selected], 'changes_requested')}>Request changes</Btn>
          <Btn size="sm" variant="danger" onClick={() => { if (window.confirm(`Reject ${selected.size} nominees?`)) setStatus([...selected], 'rejected') }}>Reject</Btn>
        </div>
      )}

      <Card flush>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr>
              <th className="checkcell"><input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} aria-label="Select all" /></th>
              <th>Nominee</th><th>Category</th><th>Contact</th><th style={{ textAlign: 'right' }}>Votes</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td className="checkcell"><input type="checkbox" checked={selected.has(x.id)} onChange={() => toggle(x.id)} aria-label={`Select ${x.name}`} /></td>
                  <td>
                    <div className="cell-user">
                      <Avatar name={x.name} photo={assetUrl(x.photo)} />
                      <div><b>{x.name}</b><div className="muted">{[x.handle, x.platform].filter(Boolean).join(' · ') || '—'}</div></div>
                    </div>
                  </td>
                  <td className="muted">{catName(x.categoryId)}</td>
                  <td className="muted">{x.email || '—'}{x.mobile ? <><br />{x.mobile}</> : null}{(x.city || x.country) ? <><br />{[x.city, x.country].filter(Boolean).join(', ')}</> : null}</td>
                  <td className="num">{Store.fmt(x.votes || 0)}</td>
                  <td><Tag>{isPending(x.status) ? 'pending' : x.status}</Tag></td>
                  <td>
                    <div className="actions">
                      {x.status !== 'approved' && <Btn size="sm" variant="ok" onClick={() => setStatus([x.id], 'approved')}>Approve</Btn>}
                      {x.status === 'approved' && <Btn size="sm" onClick={() => setStatus([x.id], 'changes_requested')}>Unpublish</Btn>}
                      <Btn size="sm" icon="pencil" onClick={() => setEditing(x)} aria-label={`Edit ${x.name}`} />
                      <Btn size="sm" variant="danger" icon="trash" onClick={() => remove(x)} aria-label={`Delete ${x.name}`} />
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="7" className="empty">{loading ? 'Loading nominees…' : 'No nominees match.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <NomineeForm nominee={editing === 'new' ? null : editing} cats={cats}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh() }} />
      )}
    </>
  )
}
