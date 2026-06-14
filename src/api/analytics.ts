import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AnalyticsData, AnalyticsVerdict } from '../lib/types'
import { api } from './client'

/** The full deterministic analytics dashboard for a window of `days`. */
export function useAnalytics(days: number) {
  return useQuery({
    queryKey: ['analytics', days],
    queryFn: () => api.get<AnalyticsData>(`/analytics?days=${days}`),
  })
}

/** Today's cached AI verdict (null until generated). */
export function useAnalyticsVerdict() {
  return useQuery({
    queryKey: ['analytics', 'verdict'],
    queryFn: () => api.get<AnalyticsVerdict | null>('/analytics/verdict'),
  })
}

/** Generate/refresh today's verdict from the current window. */
export function useRefreshVerdict() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (days: number) => api.post<AnalyticsVerdict>('/analytics/verdict/refresh', { days }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['analytics', 'verdict'] }),
  })
}
