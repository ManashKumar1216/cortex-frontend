import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client'

export interface GameSummaryRow {
  slug: string
  title: string
  category: string
  scoreLabel: string
  higherIsBetter: boolean
  best: number | null
  plays: number
  totalTimeMs: number
  lastPlayedAt: string | null
  achievementsUnlocked: number
  achievementsTotal: number
}

export interface GamesTotals {
  gamesPlayed: number
  gamesTotal: number
  totalTimeMs: number
  totalPlays: number
  dayStreak: number
  achievementsUnlocked: number
  achievementsTotal: number
}

export interface GamesSummary {
  games: GameSummaryRow[]
  totals: GamesTotals
}

export interface GameRun {
  score: number
  durationMs: number
  playedAt: string
  meta: Record<string, unknown> | null
}

export interface GameAchievementState {
  key: string
  label: string
  description: string
  unlocked: boolean
  unlockedAt: string | null
}

export interface GameDetail {
  slug: string
  title: string
  scoreLabel: string
  higherIsBetter: boolean
  best: number | null
  plays: number
  totalTimeMs: number
  lastPlayedAt: string | null
  recent: GameRun[]
  achievements: GameAchievementState[]
}

export interface RecordResult {
  best: number | null
  isHighScore: boolean
  newAchievements: { key: string; label: string; description: string; game: string }[]
}

export function useGamesSummary() {
  return useQuery({
    queryKey: ['games', 'summary'],
    queryFn: () => api.get<GamesSummary>('/games/summary'),
  })
}

export function useGameDetail(slug: string) {
  return useQuery({
    queryKey: ['games', 'detail', slug],
    queryFn: () => api.get<GameDetail>(`/games/${slug}`),
    enabled: Boolean(slug),
  })
}

export function useRecordSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { slug: string; score: number; durationMs: number; meta?: Record<string, unknown> }) =>
      api.post<RecordResult>(`/games/${input.slug}/sessions`, {
        score: input.score,
        durationMs: input.durationMs,
        meta: input.meta,
      }),
    onSuccess: (_r, input) => {
      void qc.invalidateQueries({ queryKey: ['games', 'summary'] })
      void qc.invalidateQueries({ queryKey: ['games', 'detail', input.slug] })
    },
  })
}
