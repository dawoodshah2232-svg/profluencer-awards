/* Edition dates for public copy. Values come from the admin-managed
   settings (Settings page in the CRM); the defaults below are the
   confirmed 2026 dates and only show while settings load. */
import { useAsync } from './hooks'
import { Store } from './store'

export const DEFAULT_DATES = {
  votingStart: '2026-10-15',
  votingEnd: '2026-11-30',
  ceremonyDate: '2026-12-11',
  ceremonyCity: 'Dubai',
  ceremonyVenue: '',
}

/* 'YYYY-MM-DD' -> local Date at noon (no timezone drift across a day). */
function day(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null
}
const fmt = (s, opts) => { const d = day(s); return d ? d.toLocaleDateString('en-US', opts) : '' }

/** "December 11, 2026" */
export const longDate = (s) => fmt(s, { month: 'long', day: 'numeric', year: 'numeric' })
/** "Dec 11" */
export const shortDate = (s) => fmt(s, { month: 'short', day: 'numeric' })
/** "Dec 11, 2026" */
export const shortDateYear = (s) => fmt(s, { month: 'short', day: 'numeric', year: 'numeric' })
/** "December 11" */
export const monthDay = (s) => fmt(s, { month: 'long', day: 'numeric' })
/** "Friday, Dec 11, 2026" */
export const weekdayDate = (s) => fmt(s, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })

/** Edition dates from settings, merged over the confirmed defaults. */
export function useDates() {
  const { data: s } = useAsync(() => Store.settings(), [])
  const out = { ...DEFAULT_DATES }
  if (s) {
    for (const k of Object.keys(DEFAULT_DATES)) if (s[k]) out[k] = s[k]
  }
  return out
}
