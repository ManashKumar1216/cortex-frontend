import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { TrackedItem } from '../lib/types'
import { api } from './client'

/** Pending open loops (commitments / awaited items / unanswered questions). */
export function useOpenLoops() {
  return useQuery({
    queryKey: ['tracked-items', 'open'],
    queryFn: () => api.get<TrackedItem[]>('/tracked-items/open'),
  })
}

/** Close (fulfilled) or drop (abandoned) an open loop. */
export function useTrackedItemActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['tracked-items'] })
    void qc.invalidateQueries({ queryKey: ['today'] })
  }
  return {
    fulfill: useMutation({
      mutationFn: (id: string) => api.post(`/tracked-items/${id}/fulfill`, {}),
      onSuccess: invalidate,
    }),
    abandon: useMutation({
      mutationFn: (id: string) => api.post(`/tracked-items/${id}/abandon`, {}),
      onSuccess: invalidate,
    }),
  }
}
