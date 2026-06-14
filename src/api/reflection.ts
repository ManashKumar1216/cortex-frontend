import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { DailyPrompt, Insight, JournalSuggestion, MoodStats, MorningBriefing } from '../lib/types'
import { api } from './client'

/** Mood trend over the last `days` days (default = server's MOOD_TREND_DEFAULT_DAYS). */
export function useMoodStats(days?: number) {
  return useQuery({
    queryKey: ['reflection', 'mood-stats', days ?? 'default'],
    queryFn: () => api.get<MoodStats>(`/reflection/mood-stats${days ? `?days=${days}` : ''}`),
  })
}

/** Today's AI reflection prompt (generated once per day, then cached). */
export function useDailyPrompt() {
  return useQuery({
    queryKey: ['reflection', 'prompt'],
    queryFn: () => api.get<DailyPrompt>('/reflection/prompt'),
  })
}

/** Today's morning briefing (or null until one is generated). */
export function useMorningBriefing() {
  return useQuery({
    queryKey: ['reflection', 'briefing'],
    queryFn: () => api.get<MorningBriefing | null>('/reflection/briefing'),
  })
}

/** Force-(re)generate today's morning briefing. */
export function useRefreshBriefing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<MorningBriefing | null>('/reflection/briefing/refresh', {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reflection', 'briefing'] })
      void qc.invalidateQueries({ queryKey: ['pulse'] })
    },
  })
}

/** Pending journal follow-up suggestions. */
export function useJournalSuggestions() {
  return useQuery({
    queryKey: ['reflection', 'suggestions'],
    queryFn: () => api.get<JournalSuggestion[]>('/reflection/suggestions'),
    refetchInterval: 30000,
  })
}

/** Add / dismiss a journal follow-up suggestion. */
export function useJournalSuggestionActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['reflection', 'suggestions'] })
    void qc.invalidateQueries({ queryKey: ['pulse'] })
    void qc.invalidateQueries({ queryKey: ['today'] })
  }
  const add = useMutation({
    mutationFn: (id: string) =>
      api.post<{ created: { type: string; id: string } }>(`/reflection/suggestions/${id}/add`, {}),
    onSuccess: invalidate,
  })
  const dismiss = useMutation({
    mutationFn: (id: string) =>
      api.post<JournalSuggestion>(`/reflection/suggestions/${id}/dismiss`, {}),
    onSuccess: invalidate,
  })
  return { add, dismiss }
}

// ---- Insight engine (Phase 12) ----

/** Cross-domain insights for the current user (active + kept). */
export function useInsights() {
  return useQuery({
    queryKey: ['reflection', 'insights'],
    queryFn: () => api.get<Insight[]>('/reflection/insights'),
  })
}

/** Force a regeneration pass over the insight detectors. */
export function useRefreshInsights() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ active: number; insights: Insight[] }>('/reflection/insights/refresh', {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reflection', 'insights'] }),
  })
}

/** Keep (endorse → feeds RAG) or dismiss (suppress) an insight. */
export function useInsightActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['reflection', 'insights'] })
    void qc.invalidateQueries({ queryKey: ['memory'] })
  }
  const keep = useMutation({
    mutationFn: (id: string) => api.post<Insight>(`/reflection/insights/${id}/keep`, {}),
    onSuccess: invalidate,
  })
  const dismiss = useMutation({
    mutationFn: (id: string) => api.post<Insight>(`/reflection/insights/${id}/dismiss`, {}),
    onSuccess: invalidate,
  })
  return { keep, dismiss }
}
