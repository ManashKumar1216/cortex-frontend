import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client'

export interface AgentSkill {
  id?: string
  slug: string
  title: string
  description: string
  goal: string
  allowedTools: string[]
  iterationCap?: number
  source: 'builtin' | 'user' | 'learned'
  uses?: number
  enabled?: boolean
  /** A code-defined builtin (editing forks a personal override). */
  builtin?: boolean
  /** A builtin whose content has been changed by an override (offer "Reset"). */
  customized?: boolean
}

export interface SkillInput {
  title: string
  description?: string
  goal: string
  allowedTools?: string[]
  iterationCap?: number
}

/** One agent tool, for the Skills tool picker. */
export interface ToolMeta {
  name: string
  description: string
  group: string
  kind: 'read' | 'write'
  networked?: boolean
}

export function useSkills() {
  return useQuery({ queryKey: ['skills'], queryFn: () => api.get<AgentSkill[]>('/skills') })
}

export function useToolCatalog() {
  return useQuery({ queryKey: ['agent', 'tools'], queryFn: () => api.get<ToolMeta[]>('/agent/tools') })
}

function useSkillInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['skills'] })
    void qc.invalidateQueries({ queryKey: ['chat', 'skills'] })
  }
}

export function useCreateSkill() {
  const invalidate = useSkillInvalidate()
  return useMutation({
    mutationFn: (body: SkillInput) => api.post<AgentSkill>('/skills', body),
    onSuccess: invalidate,
  })
}

export function useUpdateSkill() {
  const invalidate = useSkillInvalidate()
  return useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: Partial<SkillInput> & { enabled?: boolean } }) =>
      api.patch<AgentSkill>(`/skills/${slug}`, body),
    onSuccess: invalidate,
  })
}

export function useDeleteSkill() {
  const invalidate = useSkillInvalidate()
  return useMutation({
    mutationFn: (slug: string) => api.del(`/skills/${slug}`),
    onSuccess: invalidate,
  })
}
