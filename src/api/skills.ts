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
}

export interface SkillInput {
  title: string
  description?: string
  goal: string
  allowedTools?: string[]
  iterationCap?: number
}

export function useSkills() {
  return useQuery({ queryKey: ['skills'], queryFn: () => api.get<AgentSkill[]>('/skills') })
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
