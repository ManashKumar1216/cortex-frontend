import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { DailyRollup, MemoryStats, Note, ReindexResult, RollupResult } from '../lib/types'
import { api } from './client'
import { createEntityHooks } from './entity'

export function useMemoryStats() {
  return useQuery({
    queryKey: ['memory', 'stats'],
    queryFn: () => api.get<MemoryStats>('/memory/stats'),
  })
}

export function useReindexMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (force?: boolean) =>
      api.post<ReindexResult>('/memory/reindex', { force: force ?? false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memory', 'stats'] }),
  })
}

/** Notes / memories CRUD. */
export const notes = createEntityHooks<Note>('notes')

/** Save arbitrary text (e.g. a chat reply) as a manual memory. */
export function useSaveToMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => api.post<Note>('/notes', { content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notes'] })
      void qc.invalidateQueries({ queryKey: ['memory', 'stats'] })
    },
  })
}

export function useRollups() {
  return useQuery({ queryKey: ['rollups'], queryFn: () => api.get<DailyRollup[]>('/rollups') })
}

export function useGenerateRollup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (date?: string) => api.post<RollupResult>('/rollups/generate', { date }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rollups'] })
      void qc.invalidateQueries({ queryKey: ['memory', 'stats'] })
    },
  })
}
