import { useState } from 'react'
import { Btn, Card, Modal, PageIntro, SearchBox, StatCard, Tag, errorText } from '../../components/AdminUI'
import { Avatar, Field } from '../../components/ui'
import { useToast } from '../../components/Layout'
import { useAsync, useCopy } from '../../lib/hooks'
import { Store } from '../../lib/store'

const STAFF_ROLES = [
  ['super_admin', 'Super admin — everything, incl. other super admins'],
  ['admin', 'Admin — everything except super admin accounts'],
  ['editor', 'Editor — CRM access, no login management'],
]
const ROLE_LABEL = { super_admin: 'Super admin', admin: 'Admin', editor: 'Editor', influencer: 'Client (influencer)' }

function UserForm({ user, me, cats, onClose, onSaved }) {
  const toast = useToast()
  const editing = !!user
  const [f, setF] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'influencer',
    category_id: (cats[0] && cats[0].id) || '',
    display_name: '',
    handle: '',
    platform: 'Instagram',
    nominee_status: 'approved',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [cred, setCred] = useState(null) // login details shown once after saving
  const [, copy] = useCopy()
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const isClient = f.role === 'influencer'
  const generate = () => {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const buf = new Uint32Array(12)
    crypto.getRandomValues(buf)
    setF((x) => ({ ...x, password: Array.from(buf, (n) => abc[n % abc.length]).join('') + '!7' }))
  }
  const roles = STAFF_ROLES.filter(([r]) => r !== 'super_admin' || (me && me.role === 'super_admin'))

  const save = async () => {
    setErr('')
    if (f.name.trim().length < 2) { setErr('Enter a name.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) { setErr('Enter a valid email.'); return }
    if ((!editing || f.password) && f.password.length < 8) { setErr('Password must be at least 8 characters.'); return }
    setBusy(true)
    try {
      if (editing) {
        const body = { name: f.name.trim(), email: f.email.trim() }
        if (f.password) body.password = f.password
        if (!isClient && f.role !== user.role) body.role = f.role
        await Store.saveUser(user.id, body)
      } else {
        const body = { name: f.name.trim(), email: f.email.trim(), password: f.password, role: f.role }
        if (isClient) Object.assign(body, {
          category_id: Number(f.category_id), display_name: f.display_name.trim() || null,
          handle: f.handle.trim() || null, platform: f.platform, nominee_status: f.nominee_status,
        })
        await Store.saveUser(null, body)
      }
      toast(editing ? 'Account updated' : 'Account created')
      if (f.password) {
        const page = isClient ? '/#/login' : '/#/admin'
        setCred(`ProFluencer Awards — ${isClient ? 'creator dashboard' : 'admin panel'}
Login page: ${window.location.origin}${page}
Email: ${f.email.trim()}
Password: ${f.password}`)
      } else onSaved()
    } catch (e) { setErr(errorText(e)) } finally { setBusy(false) }
  }

  if (cred) {
    return (
      <Modal title="Login details" onClose={onSaved}
        footer={<><Btn icon="link" onClick={() => copy(cred, () => toast('Login details copied'))}>Copy</Btn><Btn variant="primary" onClick={onSaved}>Done</Btn></>}>
        <p className="hint" style={{ marginBottom: 12 }}>Copy these now and send them privately. Passwords are stored encrypted (hashed), so this is the only time this password can be shown. You can set a new one at any time with Edit.</p>
        <div className="cred-box">{cred}</div>
      </Modal>
    )
  }

  return (
    <Modal title={editing ? `Edit login — ${user.name}` : 'Create login'} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create account'}</Btn></>}>
      <div className={`form-error${err ? ' show' : ''}`}>{err}</div>
      {!editing && (
        <Field label="Account type">
          <select value={f.role} onChange={set('role')}>
            <option value="influencer">Client (influencer) — creator dashboard</option>
            {roles.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
          </select>
        </Field>
      )}
      {editing && !isClient && (
        <Field label="Role">
          <select value={f.role} onChange={set('role')} disabled={me && me.id === user.id}>
            {roles.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
          </select>
        </Field>
      )}
      <div className="form-grid">
        <Field label="Full name *"><input value={f.name} onChange={set('name')} autoComplete="off" /></Field>
        <Field label="Login email *"><input type="email" value={f.email} onChange={set('email')} autoComplete="off" /></Field>
        <div className="span2">
          <Field label={editing ? 'New password' : 'Password *'} hint={editing ? 'Leave empty to keep the current password. Changing it signs the user out everywhere.' : 'At least 8 characters.'}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={f.password} onChange={set('password')} autoComplete="new-password" />
              <Btn onClick={generate}>Generate</Btn>
            </div>
          </Field>
        </div>
      </div>
      {!editing && isClient && (
        <>
          <div className="divider">Nominee profile</div>
          <div className="form-grid">
            <Field label="Category *">
              <select value={f.category_id} onChange={set('category_id')}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Profile status">
              <select value={f.nominee_status} onChange={set('nominee_status')}>
                <option value="approved">Approved (public, can receive votes)</option>
                <option value="pending">Pending review</option>
              </select>
            </Field>
            <Field label="Public display name" hint="Empty = full name"><input value={f.display_name} onChange={set('display_name')} /></Field>
            <Field label="Handle"><input value={f.handle} onChange={set('handle')} placeholder="@handle" /></Field>
          </div>
        </>
      )}
    </Modal>
  )
}

export default function Users({ refreshKey }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('')
  const [editing, setEditing] = useState(null)
  const { data: users = [], reload, loading, error } = useAsync(() => Store.users(), [refreshKey])
  const { data: me } = useAsync(() => Store.adminMe(), [])
  const { data: cats = [] } = useAsync(() => Store.categories(), [])

  if (error && error.status === 403) {
    return <Card><p className="hint">Only super admins and admins can manage logins.</p></Card>
  }

  const staff = users.filter((u) => u.role !== 'influencer')
  const clients = users.filter((u) => u.role === 'influencer')
  const term = q.trim().toLowerCase()
  const shown = users.filter((u) => (tab === 'staff' ? u.role !== 'influencer' : tab === 'clients' ? u.role === 'influencer' : true)
    && (!term || [u.name, u.email, u.nominee && u.nominee.name].join(' ').toLowerCase().includes(term)))

  const remove = async (u) => {
    if (!window.confirm(`Delete the login for ${u.email}? ${u.role === 'influencer' ? 'Their nominee profile and votes are kept.' : ''}`)) return
    try { await Store.deleteUser(u.id); toast('Login deleted') } catch (e) { toast(errorText(e)) }
    reload()
  }

  return (
    <>
      <PageIntro right={<Btn variant="primary" icon="plus" onClick={() => setEditing('new')}>Create login</Btn>}>
        Everyone who can sign in: staff accounts for this admin panel, and client (influencer) accounts for the creator dashboard.
      </PageIntro>
      <div className="stat-grid">
        <StatCard icon="key" value={users.length} label="Total logins" />
        <StatCard icon="shield" value={staff.length} label="Staff accounts" sub="admin panel access" />
        <StatCard icon="users" tone="green" value={clients.length} label="Client accounts" sub="creator dashboard access" />
        <StatCard icon="user" tone="blue" value={me ? ROLE_LABEL[me.role] : '—'} label="Your role" sub={me ? me.email : ''} />
      </div>
      <div className="atool">
        <div className="seg">
          {[['', 'All', users.length], ['staff', 'Staff', staff.length], ['clients', 'Clients', clients.length]].map(([k, l, n]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}<em>{n}</em></button>
          ))}
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Search name or email…" />
      </div>
      <Card flush>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr><th>Account</th><th>Role</th><th>Nominee profile</th><th>Created</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td><div className="cell-user"><Avatar name={u.name} /><div><b>{u.name}{me && me.id === u.id ? ' (you)' : ''}</b><div className="muted">{u.email}</div></div></div></td>
                  <td><Tag>{u.role}</Tag></td>
                  <td className="muted">{u.nominee ? <>{u.nominee.name} · <Tag>{u.nominee.status}</Tag><br />{u.nominee.category}</> : '—'}</td>
                  <td className="muted">{u.created_at ? Store.fmtTime(u.created_at) : '—'}</td>
                  <td><div className="actions">
                    <Btn size="sm" icon="pencil" onClick={() => setEditing(u)}>Edit</Btn>
                    {!(me && me.id === u.id) && <Btn size="sm" variant="danger" icon="trash" onClick={() => remove(u)} aria-label={`Delete ${u.email}`} />}
                  </div></td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan="5" className="empty">{loading ? 'Loading…' : 'No accounts match.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && <UserForm user={editing === 'new' ? null : editing} me={me} cats={cats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </>
  )
}
