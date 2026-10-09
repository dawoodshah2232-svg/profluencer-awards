import { useAsync, useCountdown } from '../lib/hooks'
import { Store } from '../lib/store'
import { longDate, shortDateYear, useDates, weekdayDate } from '../lib/dates'

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

/* Countdown with a state-aware label.
   kind="ceremony" (default): counts down to the awards ceremony date.
   kind="voting": counts down to voting opening, then to voting close.
   Public copy uses dates only — no time-of-day claims. */
export default function Countdown({ className = '', showNote = true, kind = 'ceremony' }) {
  const dates = useDates()
  const { data: target } = useAsync(() => Store.countdownTarget(kind), [kind])
  const { data: state } = useAsync(() => Store.votingState(), [])
  const { data: settings } = useAsync(() => Store.settings(), [])
  const t = useCountdown(target ? new Date(target).getTime() : 0)

  let note
  if (kind === 'ceremony') {
    note = `Awards ceremony · ${weekdayDate(dates.ceremonyDate)} · ${dates.ceremonyCity}`
  } else {
    note = `Voting closes ${shortDateYear(dates.votingEnd)}`
    if (state === 'upcoming') note = `Voting opens ${shortDateYear(dates.votingStart)}`
    else if (state === 'closed') note = settings && settings.resultsPublished ? 'Winners announced — see results' : `Voting closed — winners crowned ${longDate(dates.ceremonyDate)}`
  }

  return (
    <div className={`countdown ${className}`}>
      {showNote && <div className="cd-label">{note}</div>}
      <Cells {...t} />
    </div>
  )
}
