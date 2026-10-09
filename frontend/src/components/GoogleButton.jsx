import { useEffect, useRef, useState } from 'react'
import { useAsync } from '../lib/hooks'
import { Store } from '../lib/store'

/* "Sign in with Google" via Google Identity Services. Renders nothing until
   a super admin enables Google and saves an OAuth Client ID in
   Settings → Social sign-in. onCredential receives the ID token, which the
   API verifies (audience = that client id) before signing anyone in. */
let gsiLoading = null
function loadGsi() {
  if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve()
  if (!gsiLoading) {
    gsiLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => { gsiLoading = null; reject(new Error('Google sign-in could not load')) }
      document.head.appendChild(s)
    })
  }
  return gsiLoading
}

export default function GoogleButton({ onCredential, text = 'continue_with' }) {
  const box = useRef(null)
  const cb = useRef(onCredential)
  cb.current = onCredential
  const [failed, setFailed] = useState(false)
  const { data: settings } = useAsync(() => Store.settings(), [])
  const clientId = settings && settings.googleEnabled ? settings.googleClientId : ''

  useEffect(() => {
    if (!clientId) return undefined
    let alive = true
    loadGsi().then(() => {
      if (!alive || !box.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => { if (res && res.credential) cb.current(res.credential) },
        ux_mode: 'popup',
      })
      box.current.innerHTML = ''
      window.google.accounts.id.renderButton(box.current, {
        type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill', text, locale: 'en',
        width: Math.min(400, box.current.offsetWidth || 360),
      })
    }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [clientId, text])

  if (!clientId) return null
  return (
    <div className="au-google">
      <div ref={box} className="au-google-btn" />
      {failed && <p className="hint">Google sign-in is unavailable right now. Use your email and password.</p>}
    </div>
  )
}

/* True when Google sign-in is configured (to decide whether to show the "or" divider). */
export function useGoogleEnabled() {
  const { data: settings } = useAsync(() => Store.settings(), [])
  return !!(settings && settings.googleEnabled && settings.googleClientId)
}
