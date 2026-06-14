import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Reminder } from '../lib/types'
import { api } from './client'

/** Pending reminders whose time has arrived — polled for the digest + nav badge. */
export function useDueReminders() {
  return useQuery({
    queryKey: ['reminders', 'due'],
    queryFn: () => api.get<Reminder[]>('/reminders/due'),
    refetchInterval: 30000,
  })
}

export function useReminderActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['reminders'] })
    void qc.invalidateQueries({ queryKey: ['today'] })
  }
  const complete = useMutation({
    mutationFn: (id: string) => api.post(`/reminders/${id}/complete`, {}),
    onSuccess: invalidate,
  })
  const snooze = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      api.post(`/reminders/${id}/snooze`, { minutes }),
    onSuccess: invalidate,
  })
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/reminders/${id}/cancel`, {}),
    onSuccess: invalidate,
  })
  return { complete, snooze, cancel }
}
