import { useCountdown } from '../lib/hooks'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

function Cells({ d, h, m, s }) {
  const cell = (v, label) => (
    <div className="cd-cell">
      <b>{String(v).padStart(2, '0')}</b>
      <span>{label}</span>
    </div>
  )
  return (
    <>
      {cell(d, 'Days')}{cell(h, 'Hours')}{cell(m, 'Mins')}{cell(s, 'Secs')}
    </>
  )
}

/* Countdown to the voting close, with a state-aware label.
   Public copy uses dates only — no time-of-day claims. */
export default function Countdown({ className = '', showNote = true }) {
  const { data: target } = useAsync(() => Store.countdownTarget(), [])
  const { data: state } = useAsync(() => Store.votingState(), [])
  const { data: settings } = useAsync(() => Store.settings(), [])
  const t = useCountdown(target ? new Date(target).getTime() : 0)

  let note = 'Voting closes Nov 30, 2026'
  if (state === 'upcoming') note = 'Voting opens Oct 15, 2026'
  else if (state === 'closed') note = settings && settings.resultsPublished ? 'Winners announced — see results' : 'Voting closed — results under review'

  return (
    <div className={`countdown ${className}`}>
      {showNote && <div className="cd-label">{note}</div>}
      <Cells {...t} />
    </div>
  )
}
