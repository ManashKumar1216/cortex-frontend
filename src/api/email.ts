import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  DumpItem,
  EmailAccount,
  EmailDraft,
  EmailIntegrationStatus,
  EmailMessage,
  EmailThread,
  EmailThreadMessage,
} from '../lib/types'
import { api } from './client'

/** Grouped conversations for the inbox list (optionally filtered by category + query). */
export function useEmailThreads(category?: string, q?: string) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (q) params.set('q', q)
  const qs = params.toString()
  return useQuery({
    queryKey: ['email', 'threads', category ?? 'all', q ?? ''],
    queryFn: () => api.get<EmailThread[]>(`/integrations/email/threads${qs ? `?${qs}` : ''}`),
    refetchInterval: 60000,
  })
}

/** All messages (with bodies) in one thread, oldest-first. */
export function useEmailThread(threadKey: string | null) {
  return useQuery({
    queryKey: ['email', 'thread', threadKey],
    enabled: !!threadKey,
    queryFn: () => api.get<EmailThreadMessage[]>(`/integrations/email/threads/${threadKey}/messages`),
  })
}

export function useEmailStatus() {
  return useQuery({
    queryKey: ['email', 'status'],
    queryFn: () => api.get<EmailIntegrationStatus>('/integrations/email/status'),
  })
}

export function useEmailAccounts() {
  return useQuery({
    queryKey: ['email', 'accounts'],
    queryFn: () => api.get<EmailAccount[]>('/integrations/email/accounts'),
  })
}

export function useEmailMessages(category?: string) {
  return useQuery({
    queryKey: ['email', 'messages', category ?? 'all'],
    queryFn: () =>
      api.get<EmailMessage[]>(`/integrations/email/messages${category ? `?category=${category}` : ''}`),
    refetchInterval: 60000,
  })
}

export function useEmailAccountActions() {
  const qc = useQueryClient()
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['email'] })
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<EmailAccount>('/integrations/email/accounts', body),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<EmailAccount>(`/integrations/email/accounts/${id}`, body),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/integrations/email/accounts/${id}`),
    onSuccess: invalidate,
  })
  const test = useMutation({
    mutationFn: (id: string) =>
      api.post<{ imap: boolean; smtp: boolean; error?: string }>(
        `/integrations/email/accounts/${id}/test`,
        {},
      ),
    // Test clears/sets quarantine server-side — refetch so the health badge updates.
    onSuccess: invalidate,
  })
  return { create, update, remove, test }
}

export function useEmailMessageActions() {
  const qc = useQueryClient()
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['email'] })
  const archive = useMutation({
    mutationFn: (id: string) => api.post<EmailMessage>(`/integrations/email/messages/${id}/archive`, {}),
    onSuccess: invalidate,
  })
  const draftReply = useMutation({
    mutationFn: (id: string) => api.post<EmailDraft>(`/integrations/email/messages/${id}/draft-reply`, {}),
  })
  const send = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: EmailDraft }) =>
      api.post<{ id: string; title: string }>(`/integrations/email/messages/${id}/send`, draft),
    onSuccess: invalidate,
  })
  // Turn a triaged email into a task / reminder / event (edited inline on the card).
  const convert = useMutation({
    mutationFn: ({ id, item }: { id: string; item: DumpItem }) =>
      api.post<{ created: { type: string; id: string } }>(
        `/integrations/email/messages/${id}/convert`,
        item,
      ),
    onSuccess: () => {
      invalidate()
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['reminders'] })
      void qc.invalidateQueries({ queryKey: ['calendar'] })
      void qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
  return { archive, draftReply, send, convert }
}

export function usePollEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ handled: number }>('/integrations/email/poll', {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['email'] }),
  })
}

/** Repair mail that was fetched while the local model was offline (re-triage + re-index). */
export function useReprocessEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{
        checked: number
        reprocessed: number
        refetched: number
        remaining: number
        llmOffline?: boolean
      }>('/integrations/email/reprocess', {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['email'] }),
  })
}
