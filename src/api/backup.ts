import { useMutation } from '@tanstack/react-query'

import { api } from './client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

/** Fetch the JSON snapshot and trigger a browser download. */
export async function downloadBackup(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/backup/export`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Export failed (${res.status})`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cortex-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface ImportReport {
  total: number
  collections: Record<string, { inserted: number; skipped: number }>
}

export function useImportBackup() {
  return useMutation({
    mutationFn: (payload: { collections?: Record<string, unknown[]> }) =>
      api.post<ImportReport>('/backup/import', payload),
  })
}
