/* Client-side voter identity helpers.
   One identity = one counted vote per category. Either the email or the
   phone matching an existing voter blocks a second vote in the same
   category; the same voter may vote in the other categories (up to 10). */

export function normalizeEmail(e) {
  return String(e || '').trim().toLowerCase()
}

export function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '')
}

export function hashStr(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(16)
}

/* Returns { ok, errors:{name,email,phone} }. Used by the voting form
   before any network/demo call. */
export function validateVoter({ name, email, phone }) {
  const errors = {}
  const n = String(name || '').trim()
  const e = normalizeEmail(email)
  const p = normalizePhone(phone)
  if (n.length < 2) errors.name = 'Please enter your full name.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) errors.email = 'Please enter a valid email address.'
  if (p.length < 7) errors.phone = 'Please enter a valid phone number.'
  return { ok: Object.keys(errors).length === 0, errors, name: n, email: e, phone: p }
}

/* Demo-mode voter session (which local voter identity this browser used).
   Production: the server owns voter identity; this is only a convenience
   so the demo UI can show "you already voted here". */
const VOTER_KEY = 'pfa_voter_v2'
export function getVoterRef() {
  try { return JSON.parse(localStorage.getItem(VOTER_KEY) || 'null') } catch { return null }
}
export function setVoterRef(voterId) {
  try { localStorage.setItem(VOTER_KEY, JSON.stringify({ voterId })) } catch {}
}

/* Human-readable messages for vote result codes. */
export const VOTE_ERRORS = {
  INVALID_NAME: 'Please enter your full name.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  VOTING_NOT_OPEN: 'Voting has not opened yet.',
  VOTING_CLOSED: 'Voting is closed.',
  NOMINEE_INELIGIBLE: 'This nominee is not eligible.',
  NOMINEE_NOT_APPROVED: 'This nominee is not approved for voting yet.',
  ALREADY_VOTED: 'You have already voted in this category.',
  VOTE_INVALIDATED: 'A previous vote in this category was invalidated and cannot be recast.',
  VOTE_FAILED: 'Could not submit your vote. Try again.',
  OTP_REQUIRED: 'Please enter the code sent to your email.',
  OTP_INVALID: 'That code is not correct. Check your email and try again.',
  INVALID_CODE: 'That code is not correct. Check your email and try again.',
  OTP_EXPIRED: 'That code has expired. Request a new one.',
  OTP_ATTEMPTS_EXHAUSTED: 'Too many wrong attempts. Please request a new code.',
  RESEND_COOLDOWN: 'Please wait a moment before requesting a new code.',
}
