import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { DumpItem } from '../lib/types'
import { api } from './client'

/** Classify a messy dump into proposed tasks/reminders/events (writes nothing). */
export function useOrganizeDump() {
  return useMutation({
    mutationFn: (text: string) => api.post<DumpItem[]>('/braindump/organize', { text }),
  })
}

/** Create the owner-confirmed (possibly-edited) items. */
export function useCommitDump() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: DumpItem[]) =>
      api.post<{ created: number; items: { type: string; title: string; id: string }[] }>(
        '/braindump/commit',
        { items },
      ),
    onSuccess: () => {
      // Refresh everything the new items could appear in.
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['reminders'] })
      void qc.invalidateQueries({ queryKey: ['calendar'] })
      void qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}
