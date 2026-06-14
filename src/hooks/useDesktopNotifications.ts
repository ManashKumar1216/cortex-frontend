import { useCallback, useEffect, useRef, useState } from 'react'

import type { Notice } from '../lib/types'

const STORAGE_KEY = 'cortex.desktopNotifications'
const supported = typeof window !== 'undefined' && 'Notification' in window

/**
 * Raises OS/desktop toasts (Web Notification API) for newly-arrived unread notices.
 * Fully local — no external push service. Fires only while a Cortex tab is open;
 * background delivery would need a service worker + Web Push (a later upgrade).
 */
export function useDesktopNotifications(notices: Notice[] | undefined) {
  const [enabled, setEnabled] = useState(() => supported && localStorage.getItem(STORAGE_KEY) === 'on')
  const seen = useRef<Set<string>>(new Set())
  const primed = useRef(false)

  // Seed the seen-set on first load so we don't toast the existing backlog.
  useEffect(() => {
    if (primed.current || !notices) return
    for (const n of notices) seen.current.add(n.id)
    primed.current = true
  }, [notices])

  useEffect(() => {
    if (!enabled || !primed.current || !notices) return
    if (!supported || Notification.permission !== 'granted') return
    for (const n of notices) {
      if (n.status === 'unread' && !seen.current.has(n.id)) {
        seen.current.add(n.id)
        try {
          new Notification(n.title, { body: n.body })
        } catch {
          /* ignore notification failures */
        }
      }
    }
  }, [notices, enabled])

  const requestEnable = useCallback(async () => {
    if (!supported) return
    const perm =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (perm === 'granted') {
      setEnabled(true)
      localStorage.setItem(STORAGE_KEY, 'on')
    }
  }, [])

  const disable = useCallback(() => {
    setEnabled(false)
    localStorage.setItem(STORAGE_KEY, 'off')
  }, [])

  return { enabled, requestEnable, disable, supported }
}
