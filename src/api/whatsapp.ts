import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  DumpItem,
  WhatsAppChat,
  WhatsAppMessage,
  WhatsAppStatus,
  WhatsAppSuggestion,
  WhatsAppSummary,
} from '../lib/types'
import { api } from './client'

const WA_PAGE = 40

/**
 * A chat's messages, newest-first per page, with load-older-on-scroll. Each page
 * returns up to WA_PAGE messages older than the previous page's oldest `ts`.
 */
export function useWhatsAppChatMessages(chatJid: string | null) {
  return useInfiniteQuery({
    queryKey: ['whatsapp', 'messages', chatJid],
    enabled: !!chatJid,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<WhatsAppMessage[]>(
        `/integrations/whatsapp/messages?chatJid=${encodeURIComponent(chatJid as string)}&limit=${WA_PAGE}` +
          (pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''),
      ),
    getNextPageParam: (lastPage) =>
      lastPage.length === WA_PAGE ? lastPage[lastPage.length - 1]?.ts : undefined,
  })
}

export function useWhatsAppStatus() {
  return useQuery({
    queryKey: ['whatsapp', 'status'],
    queryFn: () => api.get<WhatsAppStatus>('/integrations/whatsapp/status'),
    // Poll briskly so a freshly-rotated pairing QR and connection changes show up.
    refetchInterval: 4000,
  })
}

export function useWhatsAppChats() {
  return useQuery({
    queryKey: ['whatsapp', 'chats'],
    queryFn: () => api.get<WhatsAppChat[]>('/integrations/whatsapp/chats'),
    refetchInterval: 15000,
  })
}

export function useWhatsAppSummaries() {
  return useQuery({
    queryKey: ['whatsapp', 'summaries'],
    queryFn: () => api.get<WhatsAppSummary[]>('/integrations/whatsapp/summaries'),
    refetchInterval: 30000,
  })
}

export function useWhatsAppSuggestions() {
  return useQuery({
    queryKey: ['whatsapp', 'suggestions'],
    queryFn: () => api.get<WhatsAppSuggestion[]>('/integrations/whatsapp/suggestions'),
    refetchInterval: 30000,
  })
}

export function useWhatsAppActions() {
  const qc = useQueryClient()
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['whatsapp'] })

  const unlink = useMutation({
    mutationFn: () => api.post<{ ok: true }>('/integrations/whatsapp/unlink', {}),
    onSuccess: invalidate,
  })
  const mute = useMutation({
    mutationFn: ({ jid, muted }: { jid: string; muted: boolean }) =>
      api.post<{ jid: string; muted: boolean }>('/integrations/whatsapp/chats/mute', { jid, muted }),
    onSuccess: invalidate,
  })
  const consolidate = useMutation({
    mutationFn: () => api.post<{ chats: number; suggestions: number }>('/integrations/whatsapp/consolidate', {}),
    onSuccess: invalidate,
  })
  const addSuggestion = useMutation({
    mutationFn: ({ id, item }: { id: string; item?: Partial<DumpItem> }) =>
      api.post<{ created: { type: string; id: string } }>(
        `/integrations/whatsapp/suggestions/${id}/add`,
        item ?? {},
      ),
    onSuccess: () => {
      invalidate()
      // The new item shows up under tasks/reminders/calendar/today too.
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['reminders'] })
      void qc.invalidateQueries({ queryKey: ['calendar'] })
      void qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
  const dismissSuggestion = useMutation({
    mutationFn: (id: string) =>
      api.post<WhatsAppSuggestion>(`/integrations/whatsapp/suggestions/${id}/dismiss`, {}),
    onSuccess: invalidate,
  })
  return { unlink, mute, consolidate, addSuggestion, dismissSuggestion }
}
