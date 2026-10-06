import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Countdown from '../components/Countdown'
import { VBarChart } from '../components/Charts'
import { Avatar, Chip, Panel, Pill } from '../components/ui'
import { useAsync, useCopy, useInterval } from '../lib/hooks'
import { Store, getMode } from '../lib/store'
import { useToast } from '../components/Layout'

const MILESTONES = [10, 50, 100, 250, 500, 1000]
const STATUS_LABEL = {
  submitted: ['SUBMITTED', false], changes_requested: ['CHANGES REQUESTED', false],
  approved: ['APPROVED', true], rejected: ['REJECTED', false],
  withdrawn: ['WITHDRAWN', false], disqualified: ['DISQUALIFIED', false],
}

export default function InfluencerDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [, copy] = useCopy()
  const [tick, setTick] = useState(0)

  const { data: me, loading } = useAsync(() => Store.session(), [tick])
  const authed = useAsync(() => Store.session().then((s) => !!s), [tick])

  useEffect(() => {
    if (!loading && authed.data === false) navigate('/login', { replace: true })
  }, [loading, authed.data, navigate])

  useInterval(() => setTick((t) => t + 1), 30000) // refresh every 30s

  const { data: cat } = useAsync(() => (me ? Store.category(me.categoryId) : null), [me && me.id, tick])
  const { data: board = [] } = useAsync(() => (me ? Store.byCategory(me.categoryId, true) : []), [me && me.id, tick])
  const { data: rank } = useAsync(() => (me ? Store.rank(me) : -1), [me && me.id, tick])
  const { data: pct } = useAsync(() => (me ? Store.pct(me) : 0), [me && me.id, tick])
  const { data: perDay = [] } = useAsync(() => (me ? Store.votesPerDay(me.id, 14) : []), [me && me.id, tick])
  const { data: momentum } = useAsync(async () => {
    if (!me) return null
    const [today, week] = await Promise.all([
      Store.votesInLast(me.id, 24 * 3600 * 1000),
      Store.votesInLast(me.id, 7 * 24 * 3600 * 1000),
    ])
    return { today, week }
  }, [me && me.id, tick])
  const { data: settings } = useAsync(() => Store.settings(), [tick])

  if (loading || !me) {
    return (
      <div className="page-hero"><div className="container"><p className="hint">Loading your dashboard…</p></div></div>
    )
  }

  const total = board.reduce((s, x) => s + x.votes, 0)
  const leader = board[0]
  const st = STATUS_LABEL[me.status] || STATUS_LABEL.submitted
  const best = perDay.reduce((m, d) => Math.max(m, d.count), 0)
  const linkActive = me.status === 'approved'
  const link = linkActive ? Store.voteLink(me.id) : ''
  const first = me.name.split(' ')[0]

  const waTpl = `Hi! I'm nominated for the ProFluencer Awards 2026 (${cat ? cat.name : 'my category'}). Your vote takes 30 seconds and would mean the world to me: ${link}`
  const igTpl = `I'm nominated for the ProFluencer Awards 2026 (${cat ? cat.name : 'my category'})! Tap the link in my bio to vote — one vote per person, it takes 30 seconds. Thank you! #ProFluencerAwards #Dubai2026`
  const storyTpl = 'VOTE FOR ME — ProFluencer Awards 2026, link in bio! Every vote counts.'

  const shareMsg = encodeURIComponent(`Vote for me at the ProFluencer Awards 2026! ${link}`)
  const shareUrl = encodeURIComponent(link)

  const finalRow = (() => {
    if (!settings || !settings.resultsPublished || !settings.snapshot || me.status !== 'approved') return null
    const rows = settings.snapshot.categories[me.categoryId] || []
    return rows.find((r) => r.nomineeId === me.id) || 'not-top5'
  })()

  const logout = async () => { await Store.clearSession(); navigate('/', { replace: true }) }

  return (
    <div className="page-hero" style={{ paddingBottom: 30 }}>
      <div className="container">
        {params.get('welcome') && (
          <div className="form-ok show" style={{ marginBottom: 22 }}>
            <b>Nomination submitted.</b> Our team will review your profile shortly. Your personal voting link below activates as soon as you are approved — get ready to share it.
          </div>
        )}

        <div className="dash-head">
          <Avatar name={me.name} photo={me.photo} size={72} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <Chip>{cat ? cat.name : ''}</Chip>
            <Pill ok={st[1]}><span style={{ marginLeft: 8 }}>{st[0]}</span></Pill>
            <h2 style={{ marginTop: 8 }}>{me.name}</h2>
            <div className="handle">{me.handle} &middot; {me.platform}{me.followers ? ` · ${me.followers} followers` : ''}</div>
          </div>
          <button className="mini-btn" onClick={logout}>Log out</button>
        </div>
        {me.reviewNotes && <p className="hint" style={{ margin: '-14px 0 22px' }}><b>Reviewer note:</b> {me.reviewNotes}</p>}
        {getMode() === 'demo' && (
          <p className="hint" style={{ margin: '-14px 0 22px' }}>Demo preview — sample profile and votes, not real.</p>
        )}

        <div className="dash-stats">
          <div className="dstat"><b>{Store.fmt(me.votes)}</b><span>Valid votes</span></div>
          <div className="dstat"><b>{(pct || 0).toFixed(1)}%</b><span>Share of category</span></div>
          <div className="dstat"><b>{rank > 0 ? `#${rank} of ${board.length}` : '#–'}</b><span>Your rank</span></div>
          <div className="dstat"><b>{rank === 1 ? 'Leader' : leader ? Store.fmt(leader.votes - me.votes) : '–'}</b><span>Votes to #1</span></div>
        </div>
        <p className="hint" style={{ margin: '-14px 0 22px' }}>
          Provisional — subject to vote verification &middot; auto-refreshes every 30 seconds
        </p>

        {finalRow && (
          <Panel title="Final result" gold>
            {finalRow === 'not-top5' ? (
              <p className="sub">Thank you for taking part. You were not selected for the Top 5 this edition — the competition was fierce.</p>
            ) : (
              <p className="sub"><b style={{ color: 'var(--gold-lt)', fontSize: 18 }}>{finalRow.title} — Rank #{finalRow.rank}</b><br />Congratulations! See you at the ceremony on December 11.</p>
            )}
          </Panel>
        )}

        <Panel title="Vote momentum" sub="How fast your votes are coming in.">
          <div className="mstats">
            <div className="mstat"><b>{Store.fmt(momentum ? momentum.today : 0)}</b><span>Votes today</span></div>
            <div className="mstat"><b>{Store.fmt(momentum ? momentum.week : 0)}</b><span>Last 7 days</span></div>
            <div className="mstat"><b>{Store.fmt(best)}</b><span>Best day</span></div>
          </div>
          <VBarChart data={perDay} highlightLast />
          <div className="vchart-legend"><span>14 days ago</span><span>Today</span></div>
          <p className="hint" style={{ marginTop: 10 }}>
            {(momentum && momentum.today > 0)
              ? `${momentum.today} vote${momentum.today === 1 ? '' : 's'} in the last 24h — keep sharing your link.`
              : 'No votes yet in the last 24h — share your voting link to get moving.'}
          </p>
        </Panel>

        <Panel title="Milestones" sub="Every vote counts — unlock badges as your campaign grows.">
          {MILESTONES.map((m) => {
            const doneM = me.votes >= m
            const w = Math.min(100, Math.round((me.votes / m) * 100))
            return (
              <div className={`mile${doneM ? ' done' : ''}`} key={m}>
                <span className="mtitle">{Store.fmt(m)} votes</span>
                <span className={doneM ? 'badge' : 'badge locked'}>{doneM ? 'Unlocked' : `${Store.fmt(m - me.votes)} to go`}</span>
                <div className="mtrack"><i style={{ width: `${w}%` }} /></div>
              </div>
            )
          })}
        </Panel>

        <Panel title="Your personal voting link"
          sub={linkActive ? 'Share this everywhere — every verified tap is a vote. One vote per person per category.' : 'Your link activates as soon as your nomination is approved.'}>
          <div className="linkbox">
            <code>{linkActive ? link : 'Activates after approval'}</code>
            <button className="btn btn-gold btn-sm" onClick={() => linkActive ? copy(link, () => toast('Voting link copied — share it everywhere')) : toast('Available after approval')}>
              Copy link
            </button>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
            <div style={{ background: '#fff', padding: 10, borderRadius: 12 }}>
              {linkActive ? <QRCodeSVG value={link} size={110} /> : <span className="hint">QR activates after approval</span>}
            </div>
            <div>
              <div className="share-row" style={{ marginTop: 0 }}>
                <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${shareMsg}`}>WhatsApp</a>
                <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${shareUrl}&text=${shareMsg}`}>Telegram</a>
                <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${shareMsg}`}>X</a>
                <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}>Facebook</a>
              </div>
              <p className="hint" style={{ marginTop: 10 }}>Tip: print the QR on flyers, menus or event banners.</p>
            </div>
          </div>
        </Panel>

        <Panel title="Campaign toolkit" sub="Ready-made messages — copy, paste, post. Personalise the first line for best results.">
          {[
            { label: 'WhatsApp broadcast', text: waTpl },
            { label: 'Instagram / TikTok caption', text: igTpl },
            { label: 'Story / status text', text: storyTpl },
          ].map((t, i) => (
            <div className="tpl" key={i}>
              <div className="tpl-label">{t.label}</div>
              <div>{t.text}</div>
              <button className="mini-btn" onClick={() => copy(t.text, () => toast('Copied — paste it anywhere'))}>Copy message</button>
            </div>
          ))}
          <ul className="tips">
            <li><b>Post when your audience is awake</b> — evenings (7–10 PM GST) usually perform best in the UAE.</li>
            <li><b>Ask twice:</b> once in your post, once in stories — most votes come from the second ask.</li>
            <li><b>Pin your voting link</b> in your bio and story highlights for the whole voting window.</li>
            <li><b>Reply to every comment</b> on campaign posts — it doubles the reach of the post.</li>
          </ul>
        </Panel>

        <Panel title="Countdown to voting close" sub="Voting closes November 30, 2026 · Winners crowned Dec 11, afternoon session, Dubai">
          <Countdown showNote={false} className="" />
        </Panel>

        <div className="lb">
          <div className="lb-head"><h3>Top 5 — {cat ? cat.name : ''}</h3><span className="chip">Live · provisional</span></div>
          <div>
            {board.slice(0, 5).map((x, i) => {
              const p = total > 0 ? (x.votes / total) * 100 : 0
              const you = x.id === me.id
              return (
                <div className={`lb-row${you ? ' you' : ''}`} key={x.id}>
                  <div className={`rank${i === 0 ? ' r1' : ''}`}>{i + 1}</div>
                  <Avatar name={x.name} />
                  <div className="lb-info">
                    <b>{x.name}{you ? ' · YOU' : ''}</b>
                    <span>{x.handle} · {x.platform}</span>
                    <div className="bar"><i style={{ width: `${p.toFixed(1)}%` }} /></div>
                  </div>
                  <div className="lb-votes"><b>{Store.fmt(x.votes)}</b><span>{p.toFixed(1)}%</span></div>
                </div>
              )
            })}
            {!board.length && <div className="lb-row"><div className="lb-info"><span>No approved nominees in this category yet.</span></div></div>}
          </div>
        </div>

        <Panel title="The ceremony" sub="December 11, 2026 — afternoon session, Dubai. Here is what is at stake:">
          <div className="ceremony-grid">
            <div className="ceremony-card"><b>Category Winner</b><span>Rank #1 in each category takes the golden trophy on stage — 10 winners total.</span></div>
            <div className="ceremony-card"><b>Top 5 Honourees</b><span>Ranks #2–5 in each category are honoured on stage — 40 honourees total.</span></div>
            <div className="ceremony-card"><b>50 awards</b><span>10 categories × top 5 — the region&rsquo;s biggest creator celebration.</span></div>
            <div className="ceremony-card"><b>Your moment</b><span>Finalists are announced after verification. Keep campaigning until voting closes.</span></div>
          </div>
          <div style={{ marginTop: 16 }}><Link className="btn btn-ghost btn-sm" to="/event">Ceremony details &amp; RSVP</Link></div>
        </Panel>
      </div>
    </div>
  )
}
