import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AmbientStatus, AmbientTranscript } from '../lib/types'
import { api } from './client'

const API = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api`

export function useAmbientStatus() {
  return useQuery({
    queryKey: ['ambient', 'status'],
    queryFn: () => api.get<AmbientStatus>('/ambient/status'),
  })
}

export function useAmbientTranscripts(enabled = true) {
  return useQuery({
    queryKey: ['ambient', 'transcripts'],
    queryFn: () => api.get<AmbientTranscript[]>('/ambient/transcripts'),
    enabled,
  })
}

function useAmbientInvalidate() {
  const qc = useQueryClient()
  return () => {
    for (const k of [['ambient'], ['memory', 'stats']]) {
      void qc.invalidateQueries({ queryKey: k })
    }
  }
}

export function useToggleListening() {
  const invalidate = useAmbientInvalidate()
  return useMutation({
    mutationFn: (listening: boolean) => api.post<AmbientStatus>('/ambient/toggle', { listening }),
    onSuccess: invalidate,
  })
}

export function useRegenerateToken() {
  const invalidate = useAmbientInvalidate()
  return useMutation({
    mutationFn: () => api.post<{ token: string; tokenHint: string }>('/ambient/token/regenerate', {}),
    onSuccess: invalidate,
  })
}

export function useForgetAmbient() {
  const invalidate = useAmbientInvalidate()
  return useMutation({
    mutationFn: () => api.del('/ambient/forget'),
    onSuccess: invalidate,
  })
}

export function useSynthesizeAmbient() {
  return useMutation({
    mutationFn: (days?: number) =>
      api.post<{ empty: boolean; body: string; count: number }>('/ambient/synthesize', { days }),
  })
}

/** Upload one browser-mic WAV segment (multipart; cookie-authed). */
export async function uploadAmbientSegment(wav: Blob, capturedAt: Date, durationSec?: number): Promise<void> {
  const fd = new FormData()
  fd.append('audio', wav, 'ambient.wav')
  fd.append('capturedAt', capturedAt.toISOString())
  if (durationSec) fd.append('durationSec', String(durationSec))
  const res = await fetch(`${API}/ambient/browser`, { method: 'POST', body: fd, credentials: 'include' })
  if (!res.ok) throw new Error(`Ambient upload failed (${res.status})`)
}
