import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client'

export type SettingKind = 'string' | 'number' | 'boolean' | 'enum' | 'secret'

export interface SettingField {
  key: string
  group: string
  label: string
  kind: SettingKind
  min?: number
  max?: number
  options?: string[]
  optionLabels?: Record<string, string>
  help?: string
  live: boolean
}

export interface SettingsState {
  values: Record<string, string | number | boolean>
  secretsSet: Record<string, boolean>
}

/** Field catalog (labels, groups, bounds). Static for the session. */
export function useSettingsMeta() {
  return useQuery({
    queryKey: ['settings', 'meta'],
    queryFn: () => api.get<SettingField[]>('/settings/meta'),
    staleTime: Infinity,
  })
}

/** Current effective values; secrets are masked to a "set?" boolean. */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<SettingsState>('/settings'),
  })
}

export function usePatchSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch<SettingsState>('/settings', patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
