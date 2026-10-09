import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Countdown from '../components/Countdown'
import { VBarChart } from '../components/Charts'
import PanelShell from '../components/PanelShell'
import { Btn, Card, StatCard, Tag } from '../components/AdminUI'
import { Avatar } from '../components/ui'
import { useAsync, useCopy, useInterval } from '../lib/hooks'
import { Store, getMode } from '../lib/store'
import { assetUrl } from '../lib/assets'
import { longDate, useDates, weekdayDate } from '../lib/dates'
import { useToast } from '../components/Layout'

const MILESTONES = [10, 50, 100, 250, 500, 1000]
const STATUS_LABEL = {
  pending: 'pending review', submitted: 'pending review', changes_requested: 'changes requested',
  approved: 'approved', rejected: 'rejected', withdrawn: 'withdrawn', disqualified: 'disqualified',
}
const SECTIONS = {
  overview: { title: 'Overview', sub: 'Your live campaign at a glance', icon: 'home' },
  link: { title: 'Voting link & QR', sub: 'Your personal link to share everywhere', icon: 'link' },
  toolkit: { title: 'Campaign toolkit', sub: 'Ready-made messages and tips', icon: 'megaphone' },
  leaderboard: { title: 'Leaderboard', sub: 'Top 5 in your category', icon: 'trophy' },
  ceremony: { title: 'Ceremony', sub: 'The awards afternoon', icon: 'sparkles' },
  profile: { title: 'My profile', sub: 'How you appear on the website', icon: 'user' },
}

export default function InfluencerDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const dates = useDates()
  const { section = 'overview' } = useParams()
  const [params] = useSearchParams()
  const [, copy] = useCopy()
  const [tick, setTick] = useState(0)

  const { data: me, loading } = useAsync(() => Store.session(), [tick])

  useEffect(() => {
    if (!loading && !me) navigate('/login', { replace: true })
  }, [loading, me, navigate])

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
    return <div className="pnl" style={{ padding: 40 }}><p className="hint">Loading your dashboard…</p></div>
  }
  if (!SECTIONS[section]) return <Navigate to="/dashboard" replace />

  const votes = me.votes || 0
  const total = board.reduce((s, x) => s + (x.votes || 0), 0)
  const leader = board[0]
  const best = perDay.reduce((m, d) => Math.max(m, d.count), 0)
  const linkActive = me.status === 'approved'
  const link = linkActive ? Store.voteLink(me.id) : ''
  const catName = cat ? cat.name : 'my category'

  const waTpl = `Hi! I'm nominated for the ProFluencer Awards 2026 (${catName}). Your vote takes 30 seconds and would mean the world to me: ${link}`
  const igTpl = `I'm nominated for the ProFluencer Awards 2026 (${catName})! Tap the link in my bio to vote — one vote per person, it takes 30 seconds. Thank you! #ProFluencerAwards #Dubai2026`
  const storyTpl = 'VOTE FOR ME — ProFluencer Awards 2026, link in bio! Every vote counts.'
  const shareMsg = encodeURIComponent(`Vote for me at the ProFluencer Awards 2026! ${link}`)
  const shareUrl = encodeURIComponent(link)

  const finalRow = (() => {
    if (!settings || !settings.resultsPublished || !settings.snapshot || me.status !== 'approved') return null
    const rows = settings.snapshot.categories[me.categoryId] || []
    return rows.find((r) => r.nomineeId === me.id) || 'not-top5'
  })()

  const logout = async () => { await Store.clearSession(); navigate('/', { replace: true }) }
  const nav = [
    { label: '', items: [{ key: 'overview', label: SECTIONS.overview.title, icon: SECTIONS.overview.icon, to: '/dashboard' }] },
    { label: 'Campaign', items: ['link', 'toolkit', 'leaderboard'].map((k) => ({ key: k, label: SECTIONS[k].title, icon: SECTIONS[k].icon, to: `/dashboard/${k}` })) },
    { label: 'Event & account', items: ['ceremony', 'profile'].map((k) => ({ key: k, label: SECTIONS[k].title, icon: SECTIONS[k].icon, to: `/dashboard/${k}` })) },
  ]
  const cur = SECTIONS[section]

  const leaderboard = (
    <Card flush title={`Top 5 — ${cat ? cat.name : ''}`} right={<Tag tone="gold">Live · provisional</Tag>}>
      <div style={{ paddingTop: 6 }}>
        {board.slice(0, 5).map((x, i) => {
          const p = total > 0 ? ((x.votes || 0) / total) * 100 : 0
          const you = x.id === me.id
          return (
            <div className={`lb-row${you ? ' you' : ''}`} key={x.id}>
              <div className={`rank${i === 0 ? ' r1' : ''}`}>{i + 1}</div>
              <Avatar name={x.name} photo={assetUrl(x.photo)} />
              <div className="lb-info">
                <b>{x.name}{you ? ' · YOU' : ''}</b>
                <span>{[x.handle, x.platform].filter(Boolean).join(' · ')}</span>
                <div className="bar"><i style={{ width: `${p.toFixed(1)}%` }} /></div>
              </div>
              <div className="lb-votes"><b>{Store.fmt(x.votes || 0)}</b><span>{p.toFixed(1)}%</span></div>
            </div>
          )
        })}
        {!board.length && <div className="lb-row"><div className="lb-info"><span>No approved nominees in this category yet.</span></div></div>}
      </div>
    </Card>
  )

  return (
    <PanelShell
      portal="Creator"
      nav={nav}
      active={section}
      title={section === 'overview' ? `Welcome back, ${me.name.split(' ')[0]}` : cur.title}
      subtitle={section === 'overview' ? `${catName} · nomination ${STATUS_LABEL[me.status] || me.status}` : cur.sub}
      user={{ name: me.name, role: 'Nominee', photo: assetUrl(me.photo) }}
      onLogout={logout}
      actions={linkActive ? <Btn variant="primary" icon="link" onClick={() => copy(link, () => toast('Voting link copied — share it everywhere'))}><span className="hide-sm">Copy voting link</span></Btn> : <Tag tone="blue">{STATUS_LABEL[me.status] || me.status}</Tag>}
    >
      {params.get('welcome') && section === 'overview' && (
        <div className="alert ok"><b>Nomination submitted.</b> Our team will review your profile shortly. Your personal voting link activates as soon as you are approved.</div>
      )}
      {me.status !== 'approved' && section === 'overview' && !params.get('welcome') && (
        <div className="alert info"><b>Your nomination is {STATUS_LABEL[me.status] || me.status}.</b> Your voting link and QR code unlock once the awards team approves your profile.</div>
      )}
      {getMode() === 'demo' && <div className="alert info">Demo preview — sample profile and votes, not real.</div>}

      {section === 'overview' && (
        <>
          <div className="stat-grid">
            <StatCard icon="badge" value={Store.fmt(votes)} label="Valid votes" sub="provisional, auto-refreshing" />
            <StatCard icon="chart" tone="blue" value={`${(pct || 0).toFixed(1)}%`} label="Share of category" />
            <StatCard icon="trophy" tone="green" value={rank > 0 ? `#${rank} of ${board.length}` : '#–'} label="Your rank" />
            <StatCard icon="sparkles" value={rank === 1 ? 'Leader' : leader ? Store.fmt(Math.max(0, (leader.votes || 0) - votes)) : '–'} label="Votes to #1" />
          </div>

          {finalRow && (
            <Card title="Final result">
              {finalRow === 'not-top5'
                ? <p className="hint">Thank you for taking part. You were not selected for the Top 5 this edition — the competition was fierce.</p>
                : <p><b style={{ color: 'var(--gold-lt)', fontSize: 18 }}>{finalRow.title} — Rank #{finalRow.rank}</b><br />Congratulations! See you at the ceremony on {longDate(dates.ceremonyDate)}.</p>}
            </Card>
          )}

          <div className="agrid wide">
            <Card title="Vote momentum" sub="Votes per day, last 14 days">
              <div className="mstats">
                <div className="mstat"><b>{Store.fmt(momentum ? momentum.today : 0)}</b><span>Votes today</span></div>
                <div className="mstat"><b>{Store.fmt(momentum ? momentum.week : 0)}</b><span>Last 7 days</span></div>
                <div className="mstat"><b>{Store.fmt(best)}</b><span>Best day</span></div>
              </div>
              <VBarChart data={perDay} highlightLast />
              <div className="vchart-legend"><span>14 days ago</span><span>Today</span></div>
            </Card>
            <Card title="Milestones" sub="Unlock badges as your campaign grows">
              {MILESTONES.map((m) => {
                const doneM = votes >= m
                return (
                  <div className={`mile${doneM ? ' done' : ''}`} key={m}>
                    <span className="mtitle">{Store.fmt(m)} votes</span>
                    <span className={doneM ? 'badge' : 'badge locked'}>{doneM ? 'Unlocked' : `${Store.fmt(m - votes)} to go`}</span>
                    <div className="mtrack"><i style={{ width: `${Math.min(100, Math.round((votes / m) * 100))}%` }} /></div>
                  </div>
                )
              })}
            </Card>
          </div>

          <div className="agrid two">
            {leaderboard}
            <Card title="Countdown" sub={`Voting window · winners crowned ${weekdayDate(dates.ceremonyDate)}`}>
              <Countdown kind="voting" />
              <div style={{ marginTop: 18 }}><Countdown kind="ceremony" /></div>
            </Card>
          </div>
        </>
      )}

      {section === 'link' && (
        <Card title="Your personal voting link"
          sub={linkActive ? 'Share this everywhere — every verified tap is a vote. One vote per person per category.' : 'Your link activates as soon as your nomination is approved.'}>
          <div className="linkbox">
            <code>{linkActive ? link : 'Activates after approval'}</code>
            <Btn variant="primary" icon="link" onClick={() => (linkActive ? copy(link, () => toast('Voting link copied — share it everywhere')) : toast('Available after approval'))}>Copy link</Btn>
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 14 }}>
              {linkActive ? <QRCodeSVG value={link} size={150} /> : <span className="hint" style={{ color: '#555' }}>QR activates after approval</span>}
            </div>
            <div>
              <div className="share-row" style={{ marginTop: 0 }}>
                <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${shareMsg}`}>WhatsApp</a>
                <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${shareUrl}&text=${shareMsg}`}>Telegram</a>
                <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${shareMsg}`}>X</a>
                <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}>Facebook</a>
              </div>
              <p className="hint" style={{ marginTop: 12 }}>Tip: print the QR on flyers, menus or event banners.</p>
              {linkActive && <p style={{ marginTop: 8 }}><Link className="abtn sm" to={`/nominee/${me.id}`}>Open my public page</Link></p>}
            </div>
          </div>
        </Card>
      )}

      {section === 'toolkit' && (
        <Card title="Campaign toolkit" sub="Ready-made messages — copy, paste, post. Personalise the first line for best results.">
          {[
            { label: 'WhatsApp broadcast', text: waTpl },
            { label: 'Instagram / TikTok caption', text: igTpl },
            { label: 'Story / status text', text: storyTpl },
          ].map((t, i) => (
            <div className="tpl" key={i}>
              <div className="tpl-label">{t.label}</div>
              <div>{t.text}</div>
              <Btn size="sm" onClick={() => copy(t.text, () => toast('Copied — paste it anywhere'))}>Copy message</Btn>
            </div>
          ))}
          <ul className="tips">
            <li><b>Post when your audience is awake</b> — evenings (7–10 PM GST) usually perform best in the UAE.</li>
            <li><b>Ask twice:</b> once in your post, once in stories — most votes come from the second ask.</li>
            <li><b>Pin your voting link</b> in your bio and story highlights for the whole voting window.</li>
            <li><b>Reply to every comment</b> on campaign posts — it doubles the reach of the post.</li>
          </ul>
        </Card>
      )}

      {section === 'leaderboard' && (
        <>
          {leaderboard}
          <Card title="Countdown to voting close"><Countdown kind="voting" /></Card>
        </>
      )}

      {section === 'ceremony' && (
        <>
          <Card title="The awards afternoon" sub={`${weekdayDate(dates.ceremonyDate)} — afternoon session, ${dates.ceremonyCity}${dates.ceremonyVenue ? ` · ${dates.ceremonyVenue}` : ''}`}>
            <Countdown kind="ceremony" showNote={false} />
            <div className="ceremony-grid" style={{ marginTop: 18 }}>
              <div className="ceremony-card"><b>Category Winner</b><span>Rank #1 in each category takes the golden trophy on stage.</span></div>
              <div className="ceremony-card"><b>Top 5 Honourees</b><span>Ranks #2–5 in each category are honoured on stage.</span></div>
              <div className="ceremony-card"><b>50 awards</b><span>10 categories × top 5 — the region&rsquo;s biggest creator celebration.</span></div>
              <div className="ceremony-card"><b>Your moment</b><span>Finalists are announced after verification. Keep campaigning until voting closes.</span></div>
            </div>
            <div style={{ marginTop: 16 }}><Link className="abtn" to="/event">Ceremony details &amp; RSVP</Link></div>
          </Card>
        </>
      )}

      {section === 'profile' && (
        <Card title="Public profile" sub="To change any of these details, contact the awards team — they can update your profile from the admin panel.">
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 18 }}>
            <Avatar name={me.name} photo={assetUrl(me.photo)} size={72} />
            <div><b style={{ fontSize: 18 }}>{me.name}</b><div className="hint">{[me.handle, me.platform].filter(Boolean).join(' · ')}</div></div>
          </div>
          <dl className="kv">
            <dt>Category</dt><dd>{catName}</dd>
            <dt>Status</dt><dd><Tag>{STATUS_LABEL[me.status] || me.status}</Tag></dd>
            <dt>Location</dt><dd>{[me.city, me.country].filter(Boolean).join(', ') || '—'}</dd>
            <dt>Profile link</dt><dd>{me.profile_url ? <a href={me.profile_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-lt)' }}>{me.profile_url}</a> : '—'}</dd>
            <dt>Bio</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{me.bio || '—'}</dd>
          </dl>
          <div style={{ marginTop: 18 }}><Link className="abtn" to="/contact">Contact the awards team</Link></div>
        </Card>
      )}
    </PanelShell>
  )
}
