import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client'

/**
 * Standard list/create/update/delete query hooks for a domain entity.
 * Every mutation also refreshes the Today dashboard, which aggregates them.
 */
export function createEntityHooks<T>(path: string) {
  const base = [path] as const

  function useInvalidate() {
    const qc = useQueryClient()
    return () => {
      void qc.invalidateQueries({ queryKey: base })
      void qc.invalidateQueries({ queryKey: ['today'] })
    }
  }

  function useList(query = '') {
    return useQuery({
      queryKey: [path, query],
      queryFn: () => api.get<T[]>(`/${path}${query}`),
    })
  }

  function useCreate() {
    const invalidate = useInvalidate()
    return useMutation({
      mutationFn: (body: Record<string, unknown>) => api.post<T>(`/${path}`, body),
      onSuccess: invalidate,
    })
  }

  function useUpdate() {
    const invalidate = useInvalidate()
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
        api.patch<T>(`/${path}/${id}`, body),
      onSuccess: invalidate,
    })
  }

  function useRemove() {
    const invalidate = useInvalidate()
    return useMutation({
      mutationFn: (id: string) => api.del(`/${path}/${id}`),
      onSuccess: invalidate,
    })
  }

  return { base, useList, useCreate, useUpdate, useRemove }
}
