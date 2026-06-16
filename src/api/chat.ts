import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ApprovalDecision,
  ApprovalRequest,
  ChatSource,
  Conversation,
  LLMHealth,
  Message,
  PreferenceCard,
  Skill,
  ToolStep,
} from '../lib/types'
import { api } from './client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export function useLLMHealth() {
  return useQuery({
    queryKey: ['chat', 'health'],
    queryFn: () => api.get<LLMHealth>('/chat/health'),
    refetchInterval: 15000,
  })
}

export function useConversations() {
  return useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => api.get<Conversation[]>('/chat/conversations'),
  })
}

export function useSkills() {
  return useQuery({
    queryKey: ['chat', 'skills'],
    queryFn: () => api.get<Skill[]>('/chat/skills'),
    staleTime: Infinity,
  })
}

export function useMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => api.get<Message[]>(`/chat/conversations/${conversationId}/messages`),
    enabled: Boolean(conversationId),
  })
}

/** Draft a piece grounded only in the owner's notes (persists into the conversation). */
export function useDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, topic }: { conversationId?: string; topic: string }) =>
      api.post<{ conversationId: string; messageId: string }>('/chat/draft', { conversationId, topic }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['chat', 'messages', r.conversationId] })
      void qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
  })
}

/** Ask a question answered ONLY from your captures (ambient/email/chat), with citations. */
export function useAskCaptures() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, question }: { conversationId?: string; question: string }) =>
      api.post<{ conversationId: string; messageId: string }>('/chat/captures', { conversationId, question }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['chat', 'messages', r.conversationId] })
      void qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
  })
}

/** Inline draft: generate text from your notes WITHOUT persisting (for writing assists). */
export function useDraftText() {
  return useMutation({
    mutationFn: (topic: string) =>
      api.post<{ text: string; sources: ChatSource[] }>('/chat/draft/inline', { topic }),
  })
}

// ── Inferred preference card ──
export function usePreferenceCard() {
  return useQuery({
    queryKey: ['chat', 'preference-card'],
    queryFn: () => api.get<PreferenceCard | null>('/chat/preference-card'),
  })
}

export function useRegeneratePreferenceCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (force?: boolean) =>
      api.post<PreferenceCard | null>('/chat/preference-card/regenerate', { force: force ?? false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'preference-card'] }),
  })
}

export function useUpdatePreferenceCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => api.patch<PreferenceCard>('/chat/preference-card', { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'preference-card'] }),
  })
}

/** Mark an assistant reply good/bad; a liked reply is saved as a style example. */
export function useMessageFeedback() {
  return useMutation({
    mutationFn: ({ id, rating, saveExample }: { id: string; rating?: 'up' | 'down'; saveExample?: boolean }) =>
      api.post<{ ok: boolean; episode: boolean }>(`/chat/messages/${id}/feedback`, { rating, saveExample }),
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<Conversation>('/chat/conversations', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/chat/conversations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
  })
}

interface StreamEvent {
  delta?: string
  sources?: ChatSource[]
  step?: ToolStep
  approval?: ApprovalRequest
  approvalResolved?: { status: 'approved' | 'cancelled'; tool: string }
  done?: boolean
  messageId?: string
  awaitingApproval?: boolean
  error?: string
}

export interface StreamHandlers {
  onDelta: (text: string) => void
  onSources?: (sources: ChatSource[]) => void
  onStep?: (step: ToolStep) => void
  onApproval?: (req: ApprovalRequest) => void
  onResolved?: (r: { status: 'approved' | 'cancelled'; tool: string }) => void
  /** Fires on a {done} event; awaitingApproval=true means the turn paused for approval. */
  onDone?: (info: { messageId?: string; awaitingApproval: boolean }) => void
  signal?: AbortSignal
}

/** Parse an NDJSON agent stream, dispatching each event to the handlers. */
async function consumeStream(res: Response, handlers: StreamHandlers): Promise<void> {
  if (!res.ok || !res.body) throw new Error(`Chat request failed (${res.status})`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newline: number
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line) continue
      const evt = JSON.parse(line) as StreamEvent
      if (evt.delta) handlers.onDelta(evt.delta)
      if (evt.sources) handlers.onSources?.(evt.sources)
      if (evt.step) handlers.onStep?.(evt.step)
      if (evt.approval) handlers.onApproval?.(evt.approval)
      if (evt.approvalResolved) handlers.onResolved?.(evt.approvalResolved)
      if (evt.error) throw new Error(evt.error)
      if (evt.done) handlers.onDone?.({ messageId: evt.messageId, awaitingApproval: !!evt.awaitingApproval })
    }
  }
}

export interface ChatAttachment {
  kind: 'image' | 'pdf'
  /** base64, no data: prefix */
  data: string
  name?: string
}

/** POST a message and stream the assistant reply / agent turn (NDJSON). */
export async function streamMessage(
  conversationId: string,
  content: string,
  handlers: StreamHandlers,
  skillSlug?: string,
  attachment?: ChatAttachment,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, skillSlug, attachment }),
    credentials: 'include', // send the httpOnly session cookie (cross-origin stream)
    signal: handlers.signal,
  })
  await consumeStream(res, handlers)
}

/** Resolve a paused agent turn (Approve / Edit / Cancel) and stream the continuation. */
export async function resumeApproval(
  conversationId: string,
  messageId: string,
  body: { toolCallId: string; decision: ApprovalDecision; fields?: Record<string, unknown> },
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/messages/${messageId}/resume`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include', // send the httpOnly session cookie (cross-origin stream)
      signal: handlers.signal,
    },
  )
  await consumeStream(res, handlers)
}
