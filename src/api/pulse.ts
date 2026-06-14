import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Notice, WeeklyReview } from '../lib/types'
import { api } from './client'

/** Active notices (unread/read/acted) for the Pulse inbox. */
export function useNotices(status?: string) {
  return useQuery({
    queryKey: ['pulse', 'notices', status ?? 'active'],
    queryFn: () => api.get<Notice[]>(`/pulse/notices${status ? `?status=${status}` : ''}`),
    refetchInterval: 30000,
  })
}

/** Unread count for the nav bell badge. */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['pulse', 'unread'],
    queryFn: () => api.get<{ count: number }>('/pulse/notices/unread-count'),
    refetchInterval: 30000,
  })
}

export function useNoticeActions() {
  const qc = useQueryClient()
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['pulse'] })
  const read = useMutation({
    mutationFn: (id: string) => api.post<Notice>(`/pulse/notices/${id}/read`, {}),
    onSuccess: invalidate,
  })
  const dismiss = useMutation({
    mutationFn: (id: string) => api.post<Notice>(`/pulse/notices/${id}/dismiss`, {}),
    onSuccess: invalidate,
  })
  const act = useMutation({
    mutationFn: (id: string) => api.post<Notice>(`/pulse/notices/${id}/act`, {}),
    onSuccess: invalidate,
  })
  return { read, dismiss, act }
}

/** Manual "look now" — force a scan (bypasses quiet hours + the daily cap). */
export function useScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ created: number; skipped?: string }>('/pulse/scan', {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['pulse'] }),
  })
}

export function useWeeklyReviews() {
  return useQuery({
    queryKey: ['pulse', 'reviews', 'weekly'],
    queryFn: () => api.get<WeeklyReview[]>('/pulse/reviews/weekly'),
  })
}
