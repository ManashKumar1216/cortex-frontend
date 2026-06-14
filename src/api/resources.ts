import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { Resource } from '../lib/types'
import { api } from './client'
import { createEntityHooks } from './entity'

/** Resources CRUD (saved reference library). */
export const resources = createEntityHooks<Resource>('resources')

/** Force a background re-fetch of a URL resource's extracted text. */
export function useRefetchResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Resource>(`/resources/${id}/refetch`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['resources'] })
      void qc.invalidateQueries({ queryKey: ['memory', 'stats'] })
    },
  })
}
