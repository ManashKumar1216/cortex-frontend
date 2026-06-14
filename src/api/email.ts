import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  EmailAccount,
  EmailDraft,
  EmailIntegrationStatus,
  EmailMessage,
} from '../lib/types'
import { api } from './client'

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
  })
  return { create, remove, test }
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
  return { archive, draftReply, send }
}

export function usePollEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ handled: number }>('/integrations/email/poll', {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['email'] }),
  })
}
