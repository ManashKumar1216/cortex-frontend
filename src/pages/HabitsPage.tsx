import { useState, type FormEvent } from 'react'

import { Check, Flame, Pencil, Plus, Trash2, Trophy } from 'lucide-react'

import { habits, useToggleHabit } from '../api/hooks'
import { Modal } from '../components/Modal'
import { AreaSelect } from '../components/selects'
import { Button, Card, EmptyState, Field, Input, PageHeader, SkeletonText, useConfirm } from '../components/ui'
import { frequencyLabel } from '../lib/format'
import type { FrequencyKind, Habit } from '../lib/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function HabitsPage() {
  const [areaFilter, setAreaFilter] = useState('')
  const { data, isPending, isError, error } = habits.useList(areaFilter ? `?areaId=${areaFilter}` : '')
  const create = habits.useCreate()
  const update = habits.useUpdate()
  const remove = habits.useRemove()
  const toggle = useToggleHabit()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Habit | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Habits"
        subtitle="Streaks build identity"
        action={
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            Habit
          </Button>
        }
      />
      <div className="filter-row area-filter">
        <span className="muted small">Area</span>
        <AreaSelect value={areaFilter} onChange={setAreaFilter} emptyLabel="All areas" />
      </div>
      {isPending && <SkeletonText lines={3} />}
      {isError && <p className="error">{(error as Error).message}</p>}
      {data?.length === 0 && <EmptyState message="No habits yet." hint="Add a habit to start a streak." />}

      <div className="grid">
        {data?.map((habit) => (
          <Card key={habit.id}>
            <div className="row-between">
              <div className="row">
                <span className="dot" style={{ background: habit.color }} />
                <strong>{habit.name}</strong>
              </div>
              <button
                className={`check${habit.doneToday ? ' done' : ''}`}
                onClick={() => toggle.mutate({ id: habit.id, done: !habit.doneToday })}
                title={habit.doneToday ? 'Done today' : 'Mark done today'}
                aria-label={habit.doneToday ? 'Done today' : 'Mark done today'}
              >
                {habit.doneToday && <Check size={13} strokeWidth={3} />}
              </button>
            </div>
            <p className="muted small">{frequencyLabel(habit.frequency)}</p>
            <div className="streaks">
              <span className="streak">
                <Flame size={13} /> {habit.currentStreak} current
              </span>
              <span className="muted streak">
                <Trophy size={13} /> {habit.bestStreak} best
              </span>
            </div>
            <div className="card-actions">
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil size={13} />}
                onClick={() => {
                  setEditing(habit)
                  setOpen(true)
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={13} />}
                onClick={async () => {
                  if (await confirm({ title: 'Delete habit', message: `Delete "${habit.name}" and its history?`, danger: true, confirmLabel: 'Delete' }))
                    remove.mutate(habit.id)
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {open && (
        <HabitModal
          habit={editing}
          pending={create.isPending || update.isPending}
          onClose={() => setOpen(false)}
          onSubmit={(body) => {
            const onSuccess = () => setOpen(false)
            if (editing) update.mutate({ id: editing.id, body }, { onSuccess })
            else create.mutate(body, { onSuccess })
          }}
        />
      )}
    </div>
  )
}

function HabitModal({
  habit,
  onClose,
  onSubmit,
  pending,
}: {
  habit: Habit | null
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
  pending: boolean
}) {
  const [name, setName] = useState(habit?.name ?? '')
  const [color, setColor] = useState(habit?.color ?? '#7fb0a0')
  const [kind, setKind] = useState<FrequencyKind>(habit?.frequency.kind ?? 'daily')
  const [weekdays, setWeekdays] = useState<number[]>(habit?.frequency.weekdays ?? [1, 3, 5])
  const [timesPerWeek, setTimesPerWeek] = useState(habit?.frequency.timesPerWeek ?? 3)

  const toggleDay = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const frequency =
      kind === 'daily' ? { kind } : kind === 'weekdays' ? { kind, weekdays } : { kind, timesPerWeek }
    onSubmit({ name: name.trim(), color, frequency })
  }

  return (
    <Modal
      title={habit ? 'Edit habit' : 'New habit'}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} icon={<Check size={14} />} onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={submit}>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Color">
          <Input className="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </Field>
        <Field label="Frequency">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as FrequencyKind)}>
            <option value="daily">Daily</option>
            <option value="weekdays">Specific weekdays</option>
            <option value="times_per_week">X times per week</option>
          </select>
        </Field>

        {kind === 'weekdays' && (
          <div className="weekday-row">
            {WEEKDAYS.map((label, i) => (
              <button
                type="button"
                key={label}
                className={`day-toggle${weekdays.includes(i) ? ' on' : ''}`}
                onClick={() => toggleDay(i)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {kind === 'times_per_week' && (
          <Field label={`Times per week: ${timesPerWeek}`}>
            <Input
              className=""
              type="range"
              min={1}
              max={7}
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(Number(e.target.value))}
            />
          </Field>
        )}
      </form>
    </Modal>
  )
}
