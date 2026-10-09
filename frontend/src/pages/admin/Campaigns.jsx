import { useEffect, useRef, useState } from 'react'
import { Btn, Card, Empty, Modal, PageIntro, StatCard, Tag, errorText } from '../../components/AdminUI'
import { Field } from '../../components/ui'
import { useToast } from '../../components/Layout'
import { useAsync } from '../../lib/hooks'
import { Store } from '../../lib/store'

/* Email campaigns: templates (header / hero / content / footer with live
   preview), campaign composer, and per-recipient delivery + opens. */

const EMPTY_TPL = {
  name: '', subject: '', preheader: '', hero_eyebrow: '', hero_title: '', hero_subtitle: '',
  hero_image_url: '', cta_label: '', cta_url: '', body_html: '<p>Hello {{first_name}},</p>\n<p></p>', footer_note: '',
}

/* Debounced server-side render of the editor fields. */
function usePreview(fields, delay = 450) {
  const [out, setOut] = useState(null)
  const key = JSON.stringify(fields)
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      Store.previewEmailTemplate(fields).then((r) => { if (alive) setOut(r) }).catch(() => {})
    }, delay)
    return () => { alive = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay])
  return out
}

function PreviewFrame({ out }) {
  if (!out) return <div className="preview-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="hint" style={{ color: '#555' }}>Rendering preview…</span></div>
  return (
    <>
      <p className="hint" style={{ marginBottom: 8 }}>Subject: <b style={{ color: 'var(--text)' }}>{out.subject}</b></p>
      <iframe className="preview-frame" title="Email preview" srcDoc={out.html} sandbox="" />
    </>
  )
}

function TemplateEditor({ tpl, variables, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(() => Object.fromEntries(Object.keys(EMPTY_TPL).map((k) => [k, (tpl && tpl[k]) ?? EMPTY_TPL[k]])))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [testTo, setTestTo] = useState('')
  const bodyRef = useRef(null)
  const out = usePreview(f)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const isSystem = tpl && tpl.category === 'system'

  const insertVar = (v) => {
    const el = bodyRef.current
    const token = `{{${v}}}`
    if (!el) { setF((x) => ({ ...x, body_html: x.body_html + token })); return }
    const s = el.selectionStart ?? f.body_html.length
    const e2 = el.selectionEnd ?? s
    setF((x) => ({ ...x, body_html: x.body_html.slice(0, s) + token + x.body_html.slice(e2) }))
    setTimeout(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length) }, 0)
  }

  const save = async () => {
    setErr('')
    if (!f.name.trim() || !f.subject.trim()) { setErr('Name and subject are required.'); return }
    setBusy(true)
    try {
      await Store.saveEmailTemplate(tpl ? tpl.id : null, f)
      toast(tpl ? 'Template saved' : 'Template created')
      onSaved()
    } catch (e) { setErr(errorText(e)) } finally { setBusy(false) }
  }
  const sendTest = async () => {
    if (!tpl) { toast('Save the template first'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testTo.trim())) { toast('Enter an email for the test'); return }
    try { toast(await Store.testEmailTemplate(tpl.id, testTo.trim())) } catch (e) { toast(errorText(e)) }
  }

  return (
    <Modal xl title={tpl ? `Edit template — ${tpl.name}` : 'New email template'} onClose={onClose}
      footer={<>
        {tpl && <><input className="ainput" style={{ maxWidth: 240 }} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Send test to…" /><Btn icon="inbox" onClick={sendTest}>Send test</Btn></>}
        <span style={{ flex: 1 }} />
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save template'}</Btn>
      </>}>
      <div className={`form-error${err ? ' show' : ''}`}>{err}</div>
      {isSystem && <div className="alert info">This is a <b>system</b> template — the website sends it automatically ({tpl.key}). You can change the wording; keep its placeholders such as <code>{'{{code}}'}</code> or <code>{'{{reset_url}}'}</code>.</div>}
      <div className="editor">
        <div>
          <div className="form-grid">
            <Field label="Template name *"><input value={f.name} onChange={set('name')} /></Field>
            <Field label="Subject line *"><input value={f.subject} onChange={set('subject')} /></Field>
            <div className="span2"><Field label="Preheader" hint="Grey preview text shown after the subject in the inbox."><input value={f.preheader} onChange={set('preheader')} /></Field></div>
          </div>
          <div className="divider">Hero section</div>
          <div className="form-grid">
            <Field label="Eyebrow (small label)"><input value={f.hero_eyebrow} onChange={set('hero_eyebrow')} /></Field>
            <Field label="Hero image URL" hint="Optional. https:// or site path (img/hero.jpg)."><input value={f.hero_image_url} onChange={set('hero_image_url')} /></Field>
            <div className="span2"><Field label="Headline"><input value={f.hero_title} onChange={set('hero_title')} /></Field></div>
            <div className="span2"><Field label="Sub-headline"><textarea value={f.hero_subtitle} onChange={set('hero_subtitle')} rows="2" style={{ minHeight: 60 }} /></Field></div>
            <Field label="Button text"><input value={f.cta_label} onChange={set('cta_label')} /></Field>
            <Field label="Button link"><input value={f.cta_url} onChange={set('cta_url')} placeholder="{{voting_link}}" /></Field>
          </div>
          <div className="divider">Content</div>
          <Field label="Body (HTML)" hint="Use <h2>, <p>, <ul><li>, <a href>, <blockquote>. Styling is added automatically.">
            <textarea ref={bodyRef} className="code" value={f.body_html} onChange={set('body_html')} rows="10" style={{ minHeight: 220 }} />
          </Field>
          <div className="var-chips" aria-label="Insert placeholder">
            {Object.entries(variables || {}).map(([k, d]) => <button type="button" key={k} title={d} onClick={() => insertVar(k)}>{`{{${k}}}`}</button>)}
          </div>
          <div className="divider">Footer</div>
          <Field label="Footer note" hint="The logo header, links and unsubscribe line are added automatically."><textarea value={f.footer_note} onChange={set('footer_note')} rows="2" style={{ minHeight: 60 }} /></Field>
        </div>
        <div><PreviewFrame out={out} /></div>
      </div>
    </Modal>
  )
}

function Templates({ refreshKey }) {
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [previewing, setPreviewing] = useState(null)
  const { data, reload, loading, error } = useAsync(() => Store.emailTemplates(), [refreshKey])
  const list = (data && data.data) || []
  const preview = useAsync(() => (previewing ? Store.previewEmailTemplate({ id: previewing.id }) : null), [previewing && previewing.id])

  const remove = async (t) => {
    if (!window.confirm(`Delete the template "${t.name}"?`)) return
    try { await Store.deleteEmailTemplate(t.id); toast('Template deleted') } catch (e) { toast(errorText(e)) }
    reload()
  }
  if (error) return <Card><p className="hint">{errorText(error)}</p></Card>

  const group = (cat, title, sub) => (
    <Card title={title} sub={sub}>
      <div className="tpl-grid">
        {list.filter((t) => t.category === cat).map((t) => (
          <div className="tpl-card" key={t.id}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ flex: 1 }}>{t.name}</b>{cat === 'system' && <Tag tone="blue">auto</Tag>}</div>
            <div className="subj" title={t.subject}>{t.subject}</div>
            <div className="row">
              <Btn size="sm" icon="eye" onClick={() => setPreviewing(t)}>Preview</Btn>
              <Btn size="sm" icon="pencil" onClick={() => setEditing(t)}>Edit</Btn>
              {cat !== 'system' && <Btn size="sm" variant="danger" icon="trash" onClick={() => remove(t)} aria-label={`Delete ${t.name}`} />}
            </div>
          </div>
        ))}
      </div>
      {loading && !list.length && <p className="hint">Loading templates…</p>}
    </Card>
  )

  return (
    <>
      <PageIntro right={<Btn variant="primary" icon="plus" onClick={() => setEditing('new')}>New template</Btn>}>
        Every email uses the same branded layout — logo header, hero, content and footer. Campaign templates are starting points for campaigns; system templates are sent automatically by the website.
      </PageIntro>
      {group('campaign', 'Campaign templates', 'Use these when creating a campaign.')}
      {group('system', 'System emails', 'Sent automatically: vote codes, password reset, nomination updates, RSVP and contact confirmations.')}
      {editing && <TemplateEditor tpl={editing === 'new' ? null : editing} variables={data && data.variables} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      {previewing && (
        <Modal wide title={`Preview — ${previewing.name}`} onClose={() => setPreviewing(null)}
          footer={<><Btn onClick={() => setPreviewing(null)}>Close</Btn><Btn variant="primary" icon="pencil" onClick={() => { setEditing(previewing); setPreviewing(null) }}>Edit</Btn></>}>
          <PreviewFrame out={preview.data} />
        </Modal>
      )}
    </>
  )
}

function Composer({ onCreated }) {
  const toast = useToast()
  const { data: tplData } = useAsync(() => Store.emailTemplates(), [])
  const { data: campData } = useAsync(() => Store.campaigns(), [])
  const { data: cats = [] } = useAsync(() => Store.categories(), [])
  const templates = ((tplData && tplData.data) || []).filter((t) => t.category === 'campaign')
  const audiences = (campData && campData.audiences) || {}
  const [f, setF] = useState({ name: '', template_id: '', subject: '', audience: 'approved_nominees', category_id: '', custom_emails: '' })
  const [count, setCount] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const nomineeAudience = /nominees$|winners|honourees/.test(f.audience)
  const tpl = templates.find((t) => String(t.id) === String(f.template_id))
  const out = usePreview(tpl ? { id: tpl.id, subject_override: f.subject || null, campaign: true } : { name: 'x', subject: ' ' })

  useEffect(() => {
    if (!f.template_id && templates.length) setF((x) => ({ ...x, template_id: templates[0].id }))
  }, [templates.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      Store.audienceCount({ audience: f.audience, category_id: nomineeAudience && f.category_id ? Number(f.category_id) : null, custom_emails: f.custom_emails })
        .then((r) => { if (alive) setCount(r) }).catch(() => { if (alive) setCount(null) })
    }, 400)
    return () => { alive = false; clearTimeout(t) }
  }, [f.audience, f.category_id, f.custom_emails, nomineeAudience])

  const create = async (sendNow) => {
    setErr('')
    if (!f.name.trim()) { setErr('Give the campaign a name.'); return }
    if (!f.template_id) { setErr('Choose a template.'); return }
    if (sendNow && !(count && count.count)) { setErr('This audience has no recipients.'); return }
    if (sendNow && !window.confirm(`Send "${f.name}" to ${count.count} recipient${count.count === 1 ? '' : 's'} now?`)) return
    setBusy(true)
    try {
      const c = await Store.saveCampaign(null, {
        name: f.name.trim(), template_id: Number(f.template_id), subject: f.subject.trim() || null, audience: f.audience,
        category_id: nomineeAudience && f.category_id ? Number(f.category_id) : null, custom_emails: f.custom_emails || null,
      })
      toast(sendNow ? 'Campaign created — sending…' : 'Draft saved')
      onCreated(c, sendNow)
    } catch (e) { setErr(errorText(e)) } finally { setBusy(false) }
  }

  return (
    <div className="editor">
      <Card title="New campaign" sub="Pick a template and an audience. The preview shows exactly what recipients get.">
        <div className={`form-error${err ? ' show' : ''}`}>{err}</div>
        <Field label="Campaign name (internal)"><input value={f.name} onChange={set('name')} placeholder="e.g. Voting opens — nominees" /></Field>
        <Field label="Template">
          <select value={f.template_id} onChange={set('template_id')}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Subject line (optional)" hint={tpl ? `Leave empty to use: ${tpl.subject}` : ''}><input value={f.subject} onChange={set('subject')} /></Field>
        <Field label="Send to">
          <select value={f.audience} onChange={set('audience')}>
            {Object.entries(audiences).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        {nomineeAudience && (
          <Field label="Category (optional)">
            <select value={f.category_id} onChange={set('category_id')}>
              <option value="">All categories</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {f.audience === 'custom' && (
          <Field label="Email addresses" hint="One per line or comma-separated.">
            <textarea value={f.custom_emails} onChange={set('custom_emails')} rows="5" placeholder={'name@example.com\nother@example.com'} />
          </Field>
        )}
        <div className="alert info" style={{ marginBottom: 16 }}>
          <b>{count ? count.count : '…'} recipient{count && count.count === 1 ? '' : 's'}</b>{count && count.sample && count.sample.length ? <> — e.g. {count.sample.slice(0, 3).join(', ')}{count.count > 3 ? '…' : ''}</> : null}. Unsubscribed addresses are skipped automatically.
        </div>
        <div className="atool">
          <Btn onClick={() => create(false)} disabled={busy}>Save as draft</Btn>
          <Btn variant="primary" icon="inbox" onClick={() => create(true)} disabled={busy}>Send now</Btn>
        </div>
      </Card>
      <div><PreviewFrame out={tpl ? out : null} /></div>
    </div>
  )
}

/* Campaign report: progress while sending, then who received / failed / opened. */
function CampaignReport({ id, autoSend, onClose, onChanged }) {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [tick, setTick] = useState(0)
  const [sending, setSending] = useState(false)
  const { data } = useAsync(() => Store.campaign(id, `?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { search: q } : {}) })}`), [id, status, q, tick])
  const c = data && data.data
  const rows = (data && data.recipients && data.recipients.data) || []
  const started = useRef(false)

  const run = async (first) => {
    setSending(true)
    try {
      let r = first ? await Store.sendCampaign(id) : await Store.processCampaign(id)
      setTick((t) => t + 1)
      while (r && r.pending > 0) {
        r = await Store.processCampaign(id)
        setTick((t) => t + 1)
      }
      toast('Campaign sent')
    } catch (e) { toast(errorText(e)) } finally { setSending(false); setTick((t) => t + 1); onChanged() }
  }
  useEffect(() => {
    if (autoSend && !started.current) { started.current = true; run(true) }
  }, [autoSend]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return <Modal wide title="Campaign" onClose={onClose}><p className="hint">Loading…</p></Modal>
  const done = c.sent + c.failed
  const pct = c.total ? Math.round((done / c.total) * 100) : 0
  const openRate = c.sent ? Math.round((c.opened / c.sent) * 100) : 0

  return (
    <Modal xl title={c.name} onClose={onClose}
      footer={<>
        {c.status === 'draft' && <Btn variant="primary" icon="inbox" onClick={() => run(true)} disabled={sending}>Send now</Btn>}
        {c.status === 'sending' && !sending && <Btn variant="primary" onClick={() => run(false)}>Resume sending</Btn>}
        <Btn onClick={onClose}>Close</Btn>
      </>}>
      <div className="stat-grid">
        <StatCard icon="users" value={c.total} label="Recipients" sub={c.template ? c.template.name : ''} />
        <StatCard icon="check" tone="green" value={c.sent} label="Delivered to server" sub={`${pct}% processed`} />
        <StatCard icon="eye" tone="blue" value={c.opened} label="Opened" sub={`${openRate}% open rate`} />
        <StatCard icon="shield" tone="rose" value={c.failed} label="Failed" sub="see reasons below" />
      </div>
      {(sending || c.status === 'sending') && (
        <Card title={sending ? 'Sending…' : 'Paused'} sub={sending ? 'Keep this window open until it finishes.' : 'Sending stopped before finishing. Click Resume sending.'}>
          <div className="send-bar"><i style={{ width: `${pct}%` }} /></div>
          <p className="hint">{done} of {c.total} processed</p>
        </Card>
      )}
      <div className="atool">
        <div className="seg">
          {[['', 'All'], ['sent', 'Delivered'], ['opened', 'Opened'], ['failed', 'Failed'], ['pending', 'Pending'], ['skipped', 'Skipped']].map(([k, l]) => (
            <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}</button>
          ))}
        </div>
        <input className="ainput" style={{ maxWidth: 260 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email…" />
      </div>
      <div className="atable-wrap">
        <table className="atable">
          <thead><tr><th>Recipient</th><th>Status</th><th>Sent</th><th>Opened</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.email}</b>{r.name ? <div className="muted">{r.name}</div> : null}</td>
                <td><Tag tone={r.status === 'sent' ? 'green' : r.status === 'failed' ? 'red' : r.status === 'skipped' ? 'amber' : ''}>{r.status === 'sent' ? 'delivered' : r.status}</Tag>{r.error && <div className="muted" style={{ maxWidth: 380 }}>{r.error}</div>}</td>
                <td className="muted">{r.sent_at ? Store.fmtTime(r.sent_at) : '—'}</td>
                <td>{r.opened_at ? <><Tag tone="blue">opened</Tag> <span className="muted">{Store.fmtTime(r.opened_at)}{r.open_count > 1 ? ` · ${r.open_count}×` : ''}</span></> : <span className="muted">not yet</span>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="4" className="empty">No recipients here.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="tier-note">Opens are counted when the recipient&rsquo;s email app loads images; some apps block images, so the real open rate is usually higher.</p>
    </Modal>
  )
}

function CampaignList({ refreshKey, onOpen, onNew }) {
  const toast = useToast()
  const { data, reload, loading, error } = useAsync(() => Store.campaigns(), [refreshKey])
  const list = (data && data.data) || []
  const audiences = (data && data.audiences) || {}
  const totals = list.reduce((o, c) => ({ sent: o.sent + c.sent, opened: o.opened + c.opened, failed: o.failed + c.failed }), { sent: 0, opened: 0, failed: 0 })

  const remove = async (c) => {
    if (!window.confirm(`Delete the campaign "${c.name}" and its delivery report?`)) return
    try { await Store.deleteCampaign(c.id); toast('Campaign deleted') } catch (e) { toast(errorText(e)) }
    reload()
  }
  const duplicate = async (c) => {
    try { const copy = await Store.duplicateCampaign(c.id); toast('Copied to a new draft'); reload(); onOpen(copy.id, false) } catch (e) { toast(errorText(e)) }
  }
  if (error) return <Card><p className="hint">{errorText(error)}</p></Card>

  return (
    <>
      <div className="stat-grid">
        <StatCard icon="megaphone" value={list.length} label="Campaigns" sub={`${list.filter((c) => c.status === 'draft').length} drafts`} />
        <StatCard icon="check" tone="green" value={Store.fmt(totals.sent)} label="Emails delivered" />
        <StatCard icon="eye" tone="blue" value={Store.fmt(totals.opened)} label="Opened" sub={totals.sent ? `${Math.round((totals.opened / totals.sent) * 100)}% open rate` : ''} />
        <StatCard icon="shield" tone="rose" value={Store.fmt(totals.failed)} label="Failed" />
      </div>
      <Card flush>
        <div className="atable-wrap">
          <table className="atable">
            <thead><tr><th>Campaign</th><th>Audience</th><th>Status</th><th style={{ textAlign: 'right' }}>Sent</th><th style={{ textAlign: 'right' }}>Opened</th><th style={{ textAlign: 'right' }}>Failed</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b><div className="muted">{c.template ? c.template.name : 'template deleted'} · {Store.fmtTime(c.created_at)}</div></td>
                  <td className="muted">{audiences[c.audience] || c.audience}</td>
                  <td><Tag tone={c.status === 'sent' ? 'green' : c.status === 'sending' ? 'amber' : ''}>{c.status}</Tag></td>
                  <td className="num">{c.sent}/{c.total}</td>
                  <td className="num">{c.opened}{c.sent ? <div className="muted">{Math.round((c.opened / c.sent) * 100)}%</div> : null}</td>
                  <td style={{ textAlign: 'right', color: c.failed ? '#fca5a5' : 'var(--muted)' }}>{c.failed}</td>
                  <td><div className="actions">
                    <Btn size="sm" icon="chart" onClick={() => onOpen(c.id, false)}>{c.status === 'draft' ? 'Open' : 'Report'}</Btn>
                    <Btn size="sm" onClick={() => duplicate(c)}>Duplicate</Btn>
                    {c.status !== 'sending' && <Btn size="sm" variant="danger" icon="trash" onClick={() => remove(c)} aria-label={`Delete ${c.name}`} />}
                  </div></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan="7"><Empty icon="megaphone">{loading ? 'Loading…' : <>No campaigns yet. <button type="button" className="abtn sm" onClick={onNew} style={{ marginLeft: 8 }}>Create one</button></>}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

export default function Campaigns({ refreshKey }) {
  const [tab, setTab] = useState('campaigns')
  const [open, setOpen] = useState(null) // { id, autoSend }
  const [k, setK] = useState(0)

  return (
    <>
      <div className="atool">
        <div className="seg" role="tablist">
          {[['campaigns', 'Campaigns'], ['templates', 'Email templates'], ['new', 'New campaign']].map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
      </div>
      {tab === 'campaigns' && <CampaignList refreshKey={refreshKey + k} onOpen={(id, autoSend) => setOpen({ id, autoSend })} onNew={() => setTab('new')} />}
      {tab === 'templates' && <Templates refreshKey={refreshKey} />}
      {tab === 'new' && <Composer onCreated={(c, sendNow) => { setTab('campaigns'); setK((x) => x + 1); setOpen({ id: c.id, autoSend: sendNow }) }} />}
      {open && <CampaignReport id={open.id} autoSend={open.autoSend} onClose={() => { setOpen(null); setK((x) => x + 1) }} onChanged={() => setK((x) => x + 1)} />}
    </>
  )
}
