import { useQuery } from '@tanstack/react-query'

import { api } from './client'

export type SetupStatusValue = 'done' | 'todo' | 'off' | 'unknown'

export interface SetupItem {
  id: string
  label: string
  note: string
  required: boolean
  status: SetupStatusValue
  detail?: string
  link: string
  live: boolean
}

export interface SetupSection {
  id: string
  title: string
  info?: boolean
  items: SetupItem[]
}

export interface SetupStatus {
  sections: SetupSection[]
  essentialsDone: number
  essentialsTotal: number
}

/** Live setup-checklist state: which keys/config are set, with deep links. */
export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup', 'status'],
    queryFn: () => api.get<SetupStatus>('/setup/status'),
  })
}
