import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { LinkSuggestion } from '../lib/types'
import { api } from './client'

/** Suggested links for a note (lazy — only fetched when the panel is opened). */
export function useNoteLinkSuggestions(noteId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['links', noteId],
    queryFn: () => api.get<LinkSuggestion[]>(`/links/suggestions/${noteId}`),
    enabled,
  })
}

/** Compute suggestions on demand (when on-save is off, or to refresh). */
export function useSuggestLinks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => api.post<{ created: number }>(`/links/suggest/${noteId}`, {}),
    onSuccess: (_r, noteId) => qc.invalidateQueries({ queryKey: ['links', noteId] }),
  })
}

/** Accept a suggestion → a real edge in the brain graph. */
export function useAcceptLink(noteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/links/${id}/accept`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['links', noteId] })
      void qc.invalidateQueries({ queryKey: ['graph'] })
    },
  })
}

/** Dismiss a suggestion → suppresses the pair from future suggestions. */
export function useDismissLink(noteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/links/${id}/dismiss`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', noteId] }),
  })
}
