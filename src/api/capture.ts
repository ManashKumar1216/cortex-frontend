import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query'

import type { Capture } from '../lib/types'
import { api } from './client'

const API = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api`

/** URL to stream a capture's stored media (audio/image). */
export const captureMediaUrl = (id: string) => `${API}/capture/${id}/media`

/** POST multipart form-data (uploads) — the JSON client can't do this. */
async function uploadCapture(path: string, field: string, file: Blob, filename: string) {
  const fd = new FormData()
  fd.append(field, file, filename)
  // credentials:'include' so the httpOnly session cookie rides along (cross-origin).
  const res = await fetch(`${API}${path}`, { method: 'POST', body: fd, credentials: 'include' })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  return (await res.json()) as Capture
}

/** Inbox; auto-polls while any capture is still being enriched. */
export function useCaptures() {
  return useQuery({
    queryKey: ['captures'],
    queryFn: () => api.get<Capture[]>('/capture'),
    refetchInterval: (query: Query<Capture[]>) => {
      const data = query.state.data
      const busy = data?.some((c) => c.status === 'pending' || c.status === 'enriching')
      return busy ? 1500 : false
    },
  })
}

function useInbox() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['captures'] })
  }
}

export function useCaptureText() {
  const refresh = useInbox()
  return useMutation({
    mutationFn: (text: string) => api.post<Capture>('/capture/text', { text }),
    onSuccess: refresh,
  })
}

export function useCaptureVoice() {
  const refresh = useInbox()
  return useMutation({
    mutationFn: (wav: Blob) => uploadCapture('/capture/voice', 'audio', wav, 'memo.wav'),
    onSuccess: refresh,
  })
}

export function useCapturePhoto() {
  const refresh = useInbox()
  return useMutation({
    mutationFn: (file: File) => uploadCapture('/capture/photo', 'image', file, file.name),
    onSuccess: refresh,
  })
}

/** LINK mode → creates a Resource directly (background fetch fires server-side). */
export function useCaptureLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { url: string; note?: string; areaId?: string; tags?: string[] }) =>
      api.post('/capture/link', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['resources'] })
      void qc.invalidateQueries({ queryKey: ['memory', 'stats'] })
    },
  })
}

/** CALL mode → long-form. Sends a recording and/or a pasted transcript + attendees. */
export function useCaptureCall() {
  const refresh = useInbox()
  return useMutation({
    mutationFn: async (input: { audio?: Blob; transcript?: string; attendees?: string[] }) => {
      const fd = new FormData()
      if (input.audio) fd.append('audio', input.audio, 'call.wav')
      if (input.transcript) fd.append('transcript', input.transcript)
      if (input.attendees?.length) fd.append('attendees', JSON.stringify(input.attendees))
      const res = await fetch(`${API}/capture/call`, { method: 'POST', body: fd, credentials: 'include' })
      if (!res.ok) throw new Error(`Call capture failed (${res.status})`)
      return (await res.json()) as Capture
    },
    onSuccess: refresh,
  })
}

export function useSaveCallNote() {
  const refresh = useInbox()
  return useMutation({
    mutationFn: ({ id, summary }: { id: string; summary?: string }) =>
      api.post(`/capture/${id}/call/note`, { summary }),
    onSuccess: refresh,
  })
}

export function useAcceptCallItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, index, fields }: { id: string; index: number; fields?: Record<string, unknown> }) =>
      api.post(`/capture/${id}/call/items/${index}/accept`, { fields }),
    onSuccess: () => {
      for (const key of [['captures'], ['today'], ['tasks'], ['reminders'], ['notes']]) {
        void qc.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useDismissCallItem() {
  const refresh = useInbox()
  return useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) =>
      api.post(`/capture/${id}/call/items/${index}/dismiss`, {}),
    onSuccess: refresh,
  })
}

export function useBulkCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { ids: string[]; action: 'accept' | 'dismiss' | 'delete' }) =>
      api.post<{ ok: string[]; skipped: { id: string; reason: string }[] }>('/capture/bulk', body),
    onSuccess: () => {
      for (const key of [['captures'], ['today'], ['tasks'], ['notes'], ['journal'], ['memory', 'stats']]) {
        void qc.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useAcceptCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body?: { entityType?: string; fields?: Record<string, unknown> }
    }) => api.post(`/capture/${id}/accept`, body ?? {}),
    onSuccess: () => {
      for (const key of [['captures'], ['today'], ['tasks'], ['notes'], ['journal'], ['memory', 'stats']]) {
        void qc.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useDismissCapture() {
  const refresh = useInbox()
  return useMutation({
    mutationFn: (id: string) => api.post(`/capture/${id}/dismiss`, {}),
    onSuccess: refresh,
  })
}

export function useDeleteCapture() {
  const refresh = useInbox()
  return useMutation({
    mutationFn: (id: string) => api.del(`/capture/${id}`),
    onSuccess: refresh,
  })
}
