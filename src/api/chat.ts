import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ApprovalDecision,
  ApprovalRequest,
  ChatSource,
  Conversation,
  LLMHealth,
  Message,
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

/** POST a message and stream the assistant reply / agent turn (NDJSON). */
export async function streamMessage(
  conversationId: string,
  content: string,
  handlers: StreamHandlers,
  skillSlug?: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, skillSlug }),
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
