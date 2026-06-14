import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CalendarEvent, CalendarSubscription } from '../lib/types'
import { api } from './client'

interface CalendarStatus {
  subscriptions: number
  pendingEvents: number
  credKeySet: boolean
}

export function useCalendarStatus() {
  return useQuery({
    queryKey: ['calendar', 'status'],
    queryFn: () => api.get<CalendarStatus>('/calendar/status'),
  })
}

export function useCalendarSubscriptions() {
  return useQuery({
    queryKey: ['calendar', 'subscriptions'],
    queryFn: () => api.get<CalendarSubscription[]>('/calendar/subscriptions'),
  })
}

/** Suggested (from-email) events awaiting confirm/dismiss, for the Today inbox. */
export function useCalendarSuggested() {
  return useQuery({
    queryKey: ['calendar', 'events', 'suggested'],
    queryFn: () => api.get<CalendarEvent[]>('/calendar/events?includeSuggested=true'),
  })
}

function useCalInvalidate() {
  const qc = useQueryClient()
  return () => {
    for (const k of [['calendar'], ['today'], ['memory', 'stats'], ['pulse']]) {
      void qc.invalidateQueries({ queryKey: k })
    }
  }
}

export function useAddSubscription() {
  const invalidate = useCalInvalidate()
  return useMutation({
    mutationFn: (body: { label: string; url: string; color?: string }) =>
      api.post<CalendarSubscription>('/calendar/subscriptions', body),
    onSuccess: invalidate,
  })
}

export function useUpdateSubscription() {
  const invalidate = useCalInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<CalendarSubscription>(`/calendar/subscriptions/${id}`, body),
    onSuccess: invalidate,
  })
}

export function useRemoveSubscription() {
  const invalidate = useCalInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.del(`/calendar/subscriptions/${id}`),
    onSuccess: invalidate,
  })
}

export function useSyncSubscription() {
  const invalidate = useCalInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.post(`/calendar/subscriptions/${id}/sync`, {}),
    onSuccess: invalidate,
  })
}

export function useConfirmEvent() {
  const invalidate = useCalInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.post(`/calendar/events/${id}/confirm`, {}),
    onSuccess: invalidate,
  })
}

export function useDismissEvent() {
  const invalidate = useCalInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.post(`/calendar/events/${id}/dismiss`, {}),
    onSuccess: invalidate,
  })
}
