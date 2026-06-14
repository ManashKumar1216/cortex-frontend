import dayjs from 'dayjs'

import type { HabitFrequency } from './types'

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatDate(value?: string | null): string {
  if (!value) return ''
  return dayjs(value).format('MMM D, YYYY')
}

export function formatDay(value?: string | null): string {
  if (!value) return ''
  return dayjs(value).format('ddd, MMM D')
}

export function frequencyLabel(freq: HabitFrequency): string {
  if (freq.kind === 'daily') return 'Daily'
  if (freq.kind === 'times_per_week') return `${freq.timesPerWeek ?? 1}× / week`
  const days = (freq.weekdays ?? []).map((d) => WEEKDAY_NAMES[d]).join(', ')
  return days || 'Weekdays'
}

const CURRENCY_LOCALE: Record<string, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'en-IE', GBP: 'en-GB' }

/** Format money in the given ISO currency (compact, no decimals). */
export function formatMoney(amount: number, currency = 'INR'): string {
  const code = currency.toUpperCase()
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[code] ?? 'en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${code} ${Math.round(amount)}`
  }
}

export const MOOD_EMOJI: Record<number, string> = {
  1: '😞',
  2: '🙁',
  3: '😐',
  4: '🙂',
  5: '😄',
}

export const QUADRANT_META: Record<string, { label: string; hint: string }> = {
  Q1: { label: 'Do', hint: 'Urgent & Important' },
  Q2: { label: 'Plan', hint: 'Important, Not Urgent' },
  Q3: { label: 'Delegate', hint: 'Urgent, Not Important' },
  Q4: { label: 'Eliminate', hint: 'Neither' },
}
