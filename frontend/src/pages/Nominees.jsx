import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar, Field, PageHero } from '../components/ui'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

export default function Nominees() {
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [fcat, setFcat] = useState(params.get('cat') || '')
  const [fplat, setFplat] = useState('')

  const { data: cats = [] } = useAsync(() => Store.categories(), [])
  const { data: list = [], loading } = useAsync(() => Store.approved(), [])

  const plats = useMemo(() => [...new Set(list.map((x) => x.platform))].sort(), [list])

  const filtered = list.filter((x) => {
    if (fcat && x.categoryId !== fcat) return false
    if (fplat && x.platform !== fplat) return false
    const term = q.trim().toLowerCase()
    if (term && (x.name + ' ' + x.handle).toLowerCase().indexOf(term) === -1) return false
    return true
  })

  const catName = (id) => (cats.find((c) => c.id === id) || {}).name || ''

  return (
    <>
      <PageHero
        eyebrow="Approved nominees"
        title="Meet the contenders"
        sub="Every profile below is reviewed and approved. Search, filter, open a profile and cast your verified vote."
      >
        <div className="dir-tools">
          <Field noMargin><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or handle…" autoComplete="off" /></Field>
          <Field noMargin>
            <select value={fcat} onChange={(e) => setFcat(e.target.value)}>
              <option value="">All categories</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field noMargin>
            <select value={fplat} onChange={(e) => setFplat(e.target.value)}>
              <option value="">All platforms</option>
              {plats.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
      </PageHero>

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <p className="hint" style={{ marginBottom: 14 }}>
            {loading ? 'Loading nominees…' : `${filtered.length} approved nominee${filtered.length === 1 ? '' : 's'}`}
          </p>
          <div className="nom-grid">
            {filtered.map((x) => (
              <Link className="nom-card" key={x.id} to={`/nominee/${x.id}`}>
                <Avatar name={x.name} photo={x.photo} />
                <div style={{ minWidth: 0 }}>
                  <b>{x.name}</b>
                  <div className="meta">{x.handle} &middot; {x.platform}</div>
                  <div className="meta" style={{ color: 'var(--gold-lt)' }}>{catName(x.categoryId)}</div>
                </div>
                <span className="go">Vote &rarr;</span>
              </Link>
            ))}
          </div>
          {!loading && !filtered.length && (
            <div className="center mt"><p className="sec-sub">No nominees match your search yet.</p></div>
          )}
        </div>
      </section>
    </>
  )
}
