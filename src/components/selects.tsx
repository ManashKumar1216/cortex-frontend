import { areas, goals, projects } from '../api/hooks'
import type { Status } from '../lib/types'

const STATUSES: Status[] = ['active', 'paused', 'done', 'archived']

const codeLabel = (code: string | undefined, name: string): string => (code ? `${code} ${name}` : name)

/** Grouped area picker: each lane is an <optgroup> (and is itself selectable),
 * with its sub-areas listed under it. Used in entity forms and as a list filter. */
export function AreaSelect({
  value,
  onChange,
  emptyLabel = '— No area —',
}: {
  value: string
  onChange: (v: string) => void
  emptyLabel?: string
}) {
  const { data } = areas.useList()
  const list = data ?? []
  const lanes = list.filter((a) => !a.parentId)
  const subsOf = (laneId: string) => list.filter((a) => String(a.parentId) === laneId)
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{emptyLabel}</option>
      {lanes.map((lane) => (
        <optgroup key={lane.id} label={codeLabel(lane.code, lane.name)}>
          <option value={lane.id}>{codeLabel(lane.code, lane.name)}</option>
          {subsOf(lane.id).map((s) => (
            <option key={s.id} value={s.id}>
              {'  '}
              {codeLabel(s.code, s.name)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export function GoalSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = goals.useList()
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— No goal —</option>
      {data?.map((g) => (
        <option key={g.id} value={g.id}>
          {g.title}
        </option>
      ))}
    </select>
  )
}

export function ProjectSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { data } = projects.useList()
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— No project —</option>
      {data?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title}
        </option>
      ))}
    </select>
  )
}

export function StatusSelect({
  value,
  onChange,
}: {
  value: Status
  onChange: (v: Status) => void
}) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value as Status)}>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  )
}
