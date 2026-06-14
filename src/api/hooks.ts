import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Area, Goal, Habit, JournalEntry, Project, Task, TodayData } from '../lib/types'
import { api } from './client'
import { createEntityHooks } from './entity'

export const areas = createEntityHooks<Area>('areas')
export const goals = createEntityHooks<Goal>('goals')
export const projects = createEntityHooks<Project>('projects')
export const tasks = createEntityHooks<Task>('tasks')
export const habits = createEntityHooks<Habit>('habits')
export const journal = createEntityHooks<JournalEntry>('journal')

export function useToday() {
  return useQuery({ queryKey: ['today'], queryFn: () => api.get<TodayData>('/today') })
}

/** Check off / un-check a habit on a given day (default today). */
export function useToggleHabit() {
  const qc = useQueryClient()
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['habits'] })
    void qc.invalidateQueries({ queryKey: ['today'] })
  }
  return useMutation({
    mutationFn: async ({ id, done, date }: { id: string; done: boolean; date?: string }) => {
      if (done) await api.post<Habit>(`/habits/${id}/logs`, { date })
      else await api.del(`/habits/${id}/logs${date ? `?date=${date}` : ''}`)
    },
    onSuccess: refresh,
  })
}
