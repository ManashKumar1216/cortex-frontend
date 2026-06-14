import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { NewsSlotSection, NewsSummary, NewsTab, NewsTopic, NewsTopicKind } from '../lib/types'
import { api } from './client'

export function useNewsTab(tab: NewsTab) {
  return useQuery({
    queryKey: ['news', 'tab', tab],
    queryFn: () => api.get<NewsSlotSection[]>(`/news?tab=${tab}`),
  })
}

export function useNewsSummary() {
  return useQuery({
    queryKey: ['news', 'summary'],
    queryFn: () => api.get<NewsSummary>('/news/summary'),
  })
}

/** Lazy fallback: fetch a two-paragraph summary + byline on demand (only when an
 *  item's summary wasn't precomputed at build time). */
export function useNewsDetail(hash: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['news', 'detail', hash],
    queryFn: () => api.post<{ summary: string; author: string; headlineOnly: boolean }>('/news/detail', { hash }),
    enabled: enabled && !!hash,
    staleTime: 5 * 60 * 1000,
  })
}

export function useNewsTopics(enabled = true) {
  return useQuery({
    queryKey: ['news', 'topics'],
    queryFn: () => api.get<NewsTopic[]>('/news/topics'),
    enabled,
  })
}

function useNewsInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['news'] })
  }
}

export function useRefreshNews() {
  const invalidate = useNewsInvalidate()
  return useMutation({
    mutationFn: (tab: NewsTab) => api.post(`/news/refresh`, { tab }),
    onSuccess: invalidate,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (hash: string) => api.post('/news/read', { hash }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['news'] }) // refresh tab (dim card) + summary (badges)
    },
  })
}

export function useDeriveTopics() {
  const invalidate = useNewsInvalidate()
  return useMutation({
    mutationFn: () => api.post<{ created: number; topics: number; subreddits: number }>('/news/topics/derive', {}),
    onSuccess: invalidate,
  })
}

export function useAddNewsTopic() {
  const invalidate = useNewsInvalidate()
  return useMutation({
    mutationFn: (body: { kind: NewsTopicKind; label: string }) => api.post<NewsTopic[]>('/news/topics', body),
    onSuccess: invalidate,
  })
}

export function useUpdateNewsTopic() {
  const invalidate = useNewsInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { muted?: boolean; pinned?: boolean } }) =>
      api.patch<NewsTopic>(`/news/topics/${id}`, body),
    onSuccess: invalidate,
  })
}

export function useRemoveNewsTopic() {
  const invalidate = useNewsInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.del(`/news/topics/${id}`),
    onSuccess: invalidate,
  })
}

/** Adaptive signal — fire-and-forget when the owner opens or dismisses a topic. */
export function recordNewsEngagement(label: string, action: 'open' | 'dismiss'): void {
  void api.post('/news/engagement', { label, action }).catch(() => undefined)
}
