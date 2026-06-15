import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * App-wide clock preference. The single source of truth for how every time in
 * the UI is rendered. Backed by the `TIME_FORMAT` setting (default 24-hour);
 * synced into this module once settings load, then read synchronously by the
 * formatters below so even module-scope helpers can format without a hook.
 */
export type TimeFormat = '24h' | '12h'

let current: TimeFormat = '24h'
const listeners = new Set<() => void>()

/** Push the saved preference into the store. Called when settings load/change. */
export function setTimeFormatPref(value: string | null | undefined): void {
  const next: TimeFormat = value === '12h' ? '12h' : '24h'
  if (next === current) return
  current = next
  for (const l of listeners) l()
}

export function getTimeFormat(): TimeFormat {
  return current
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Subscribe a component to the clock preference so it re-renders on change. */
export function useTimeFormat(): TimeFormat {
  return useSyncExternalStore(subscribe, getTimeFormat, getTimeFormat)
}

/** A live clock that re-renders the caller every `intervalMs` (default 1 min). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Clock only — "14:30" (24h) or "2:30 PM" (12h). */
export function formatTime(
  value: string | number | Date | null | undefined,
  fmt: TimeFormat = current,
): string {
  const d = toDate(value)
  if (!d) return ''
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: fmt === '12h' })
}

/** A same-day start–end clock range, e.g. "14:30 – 15:00". */
export function formatTimeRange(
  start: string | number | Date | null | undefined,
  end: string | number | Date | null | undefined,
  fmt: TimeFormat = current,
): string {
  const s = formatTime(start, fmt)
  const e = formatTime(end, fmt)
  return e ? `${s} – ${e}` : s
}

/** Date + clock, e.g. "Jun 16, 14:30" (with year: "Jun 16, 2026, 14:30"). */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  fmt: TimeFormat = current,
  opts: { withYear?: boolean } = {},
): string {
  const d = toDate(value)
  if (!d) return ''
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(opts.withYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: fmt === '12h',
  })
}
