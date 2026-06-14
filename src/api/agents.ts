import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { LifeAgent } from '../lib/types'
import { api } from './client'

/** The Life Agent for one lane (null until configured). */
export function useAgent(areaId: string | undefined) {
  return useQuery({
    queryKey: ['agent', areaId],
    queryFn: () => api.get<LifeAgent | null>(`/agents/${areaId}`),
    enabled: !!areaId,
  })
}

/** Enable/disable + configure (focus, cadence), run-now, and clear-memory for a lane's agent. */
export function useAgentActions(areaId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['agent', areaId] })
    void qc.invalidateQueries({ queryKey: ['pulse'] })
  }
  const update = useMutation({
    mutationFn: (body: { enabled?: boolean; focus?: string; cadenceDays?: number }) =>
      api.put<LifeAgent>(`/agents/${areaId}`, body),
    onSuccess: invalidate,
  })
  const run = useMutation({
    mutationFn: () => api.post<LifeAgent>(`/agents/${areaId}/run`, {}),
    onSuccess: invalidate,
  })
  const clearMemory = useMutation({
    mutationFn: () => api.post<LifeAgent>(`/agents/${areaId}/memory/clear`, {}),
    onSuccess: invalidate,
  })
  return { update, run, clearMemory }
}
