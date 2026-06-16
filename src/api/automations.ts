import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Automation } from '../lib/types'
import { api } from './client'

export interface AutomationInput {
  name: string
  prompt: string
  recurrence?: Automation['recurrence']
  nextRunAt?: string
  deliver?: ('push' | 'inbox')[]
  webSearch?: boolean
  enabled?: boolean
}

/** A row or builtin template as returned by GET /automations (merged list). */
export interface AutomationView {
  id?: string
  name: string
  prompt: string
  description?: string
  recurrence?: Automation['recurrence']
  nextRunAt?: string | null
  lastRunAt?: string | null
  lastOutput?: string
  lastStatus?: 'ok' | 'error'
  deliver: ('push' | 'inbox')[]
  webSearch: boolean
  enabled: boolean
  source: 'builtin' | 'user'
  builtin: boolean
  builtinSlug?: string
  /** A builtin with a DB row (scheduled or disabled), vs. a pristine template. */
  activated: boolean
  customized: boolean
  createdAt?: string
  updatedAt?: string
}

export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get<AutomationView[]>('/automations'),
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['automations'] })
    void qc.invalidateQueries({ queryKey: ['pulse'] })
  }
}

export function useCreateAutomation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: AutomationInput) => api.post<Automation>('/automations', body),
    onSuccess: invalidate,
  })
}

export function useUpdateAutomation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AutomationInput> }) =>
      api.patch<Automation>(`/automations/${id}`, body),
    onSuccess: invalidate,
  })
}

export function useDeleteAutomation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.del(`/automations/${id}`),
    onSuccess: invalidate,
  })
}

export function useRunAutomation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: boolean; output: string }>(`/automations/${id}/run`, {}),
    onSuccess: invalidate,
  })
}

/** Activate / re-enable / disable a builtin template by slug (materializes a DB job). */
export function useActivateBuiltinAutomation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ slug, enabled = true }: { slug: string; enabled?: boolean }) =>
      api.post<AutomationView>(`/automations/builtins/${slug}/activate`, { enabled }),
    onSuccess: invalidate,
  })
}
