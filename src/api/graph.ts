import { useQuery } from '@tanstack/react-query'

import type { GraphPayload } from '../lib/types'
import { api } from './client'

/** The deterministic backbone graph (areas → goals → projects → tasks, + habits/journal/notes). */
export function useGraph() {
  return useQuery({
    queryKey: ['graph'],
    queryFn: () => api.get<GraphPayload>('/graph'),
  })
}
