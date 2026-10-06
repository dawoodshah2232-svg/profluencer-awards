/* ProFluencer Awards — Laravel API client.
   All calls are prefixed with /api/v1. Base URL comes from VITE_API_URL
   (see .env.example). When the API is unreachable the app falls back to
   the built-in demo store (src/lib/demoData.js). */

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '')

export const API_BASE = API_URL

export class ApiError extends Error {
  constructor(status, message, payload) {
    super(message || `API request failed (${status})`)
    this.status = status
    this.payload = payload
  }
}

async function req(path, { method = 'GET', body, token, timeout = 10000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    if (!res.ok) {
      throw new ApiError(res.status, (data && (data.message || data.error)) || res.statusText, data)
    }
    return data
  } finally {
    clearTimeout(t)
  }
}

export const api = {
  get: (path, opts) => reqWithStatus(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => reqWithStatus(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => reqWithStatus(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => reqWithStatus(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => reqWithStatus(path, { ...opts, method: 'DELETE' }),

  /* Liveness probe used to decide api-vs-demo mode. Short timeout, cached. */
  health: () => reqWithStatus('/health', { timeout: 2500 }),
}

/* Connectivity status bus. Tracks whether the API server is reachable at
   the network level (as opposed to HTTP error statuses, which are
   delivered per-call as ApiError). The app shell subscribes to show a
   global "cannot reach server" banner — API failures are never silent. */
let reachable = true
const reachSubs = new Set()
function setReachable(v) {
  if (v === reachable) return
  reachable = v
  reachSubs.forEach((f) => { try { f(v) } catch {} })
}
export const isApiReachable = () => reachable
export function subscribeApiReachable(fn) {
  reachSubs.add(fn)
  return () => { reachSubs.delete(fn) }
}

const _req = req
async function reqWithStatus(path, opts) {
  try {
    const r = await _req(path, opts)
    setReachable(true)
    return r
  } catch (e) {
    /* Network-level failure (fetch threw) = server unreachable. HTTP
       error statuses arrive as ApiError and are handled per-call. */
    if (!(e instanceof ApiError)) setReachable(false)
    throw e
  }
}

let healthCache = null
export async function apiAvailable() {
  if (healthCache !== null) return healthCache
  try {
    await api.health()
    healthCache = true
  } catch {
    healthCache = false
  }
  return healthCache
}

/* Token storage (influencer + admin sessions against the Laravel API). */
const TOKEN_KEY = 'pfa_api_token'
const ADMIN_TOKEN_KEY = 'pfa_api_admin_token'
export const tokens = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (v) => { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY) } catch {} },
  getAdmin: () => { try { return localStorage.getItem(ADMIN_TOKEN_KEY) } catch { return null } },
  setAdmin: (v) => { try { v ? localStorage.setItem(ADMIN_TOKEN_KEY, v) : localStorage.removeItem(ADMIN_TOKEN_KEY) } catch {} },
}
