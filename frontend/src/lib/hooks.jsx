import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeMode } from './store'

/* useAsync(asyncFn, deps): runs an async store call, returns
   { data, loading, error, reload }. Re-runs when the backend mode
   flips between demo and api. */
export function useAsync(asyncFn, deps = []) {
  /* undefined (not null) so call-site destructuring defaults like
     `const { data: list = [] }` apply on first render. */
  const [data, setData] = useState()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)
  const alive = useRef(true)

  const run = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.resolve()
      .then(asyncFn)
      .then((d) => { if (alive.current) { setData(d); setLoading(false) } })
      .catch((e) => { if (alive.current) { setError(e); setLoading(false) } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  useEffect(() => {
    alive.current = true
    run()
    const off = subscribeMode(() => setTick((t) => t + 1))
    return () => { alive.current = false; off() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  return { data, loading, error, reload: () => setTick((t) => t + 1) }
}

/* useInterval(fn, ms): run fn every ms (for the 30s dashboard refresh). */
export function useInterval(fn, ms) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (ms == null) return
    const id = setInterval(() => ref.current(), ms)
    return () => clearInterval(id)
  }, [ms])
}

/* useCountdown(targetMs): { d, h, m, s } ticking every second. */
export function useCountdown(targetMs) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, (targetMs || 0) - nowMs)
  return {
    d: Math.floor(diff / 864e5),
    h: Math.floor(diff / 36e5) % 24,
    m: Math.floor(diff / 6e4) % 60,
    s: Math.floor(diff / 1e3) % 60,
  }
}

/* useLocalCopy(text): copies text to clipboard, returns [copied, copy]. */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async (text, onDone) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (onDone) onDone()
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }, [])
  return [copied, copy]
}
