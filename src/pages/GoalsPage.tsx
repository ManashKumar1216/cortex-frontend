import { useState, type FormEvent } from 'react'

import { areas, goals } from '../api/hooks'
import { Modal } from '../components/Modal'
import { AreaSelect, StatusSelect } from '../components/selects'
import { EmptyState, Field, PageHeader, StatusBadge } from '../components/ui'
import { formatDate } from '../lib/format'
import type { Goal, Status } from '../lib/types'

export function GoalsPage() {
  const [areaFilter, setAreaFilter] = useState('')
  const { data, isPending, isError, error } = goals.useList(areaFilter ? `?areaId=${areaFilter}` : '')
  const areaList = areas.useList()
  const create = goals.useCreate()
  const update = goals.useUpdate()
  const remove = goals.useRemove()
  const [editing, setEditing] = useState<Goal | null>(null)
  const [open, setOpen] = useState(false)

  const areaName = (id?: string | null) => areaList.data?.find((a) => a.id === id)?.name

  return (
    <div>
      <PageHeader
        title="Goals"
        subtitle="What you're working toward"
        action={
          <button
            className="btn primary"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            + Goal
          </button>
        }
      />
      <div className="filter-row area-filter">
        <span className="muted small">Area</span>
        <AreaSelect value={areaFilter} onChange={setAreaFilter} emptyLabel="All areas" />
      </div>
      {isPending && <p className="muted">Loading…</p>}
      {isError && <p className="error">{(error as Error).message}</p>}
      {data?.length === 0 && <EmptyState message="No goals yet." />}

      <div className="list">
        {data?.map((goal) => (
          <div key={goal.id} className="card row-between">
            <div>
              <div className="row">
                <strong>{goal.title}</strong>
                <StatusBadge status={goal.status} />
              </div>
              <p className="muted small">
                {areaName(goal.areaId) && <>📁 {areaName(goal.areaId)} · </>}
                {goal.targetDate ? `🎯 ${formatDate(goal.targetDate)}` : 'no target date'}
              </p>
              {goal.description && <p className="muted">{goal.description}</p>}
            </div>
            <div className="card-actions">
              <button
                className="btn ghost"
                onClick={() => {
                  setEditing(goal)
                  setOpen(true)
                }}
              >
                Edit
              </button>
              <button
                className="btn ghost danger"
                onClick={() => {
                  if (confirm(`Delete goal "${goal.title}"?`)) remove.mutate(goal.id)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <GoalModal
          goal={editing}
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

function GoalModal({
  goal,
  onClose,
  onSubmit,
}: {
  goal: Goal | null
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
}) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [areaId, setAreaId] = useState(goal?.areaId ?? '')
  const [status, setStatus] = useState<Status>(goal?.status ?? 'active')
  const [targetDate, setTargetDate] = useState(goal?.targetDate?.slice(0, 10) ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      areaId: areaId || null,
      status,
      targetDate: targetDate || null,
    })
  }

  return (
    <Modal title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Area">
          <AreaSelect value={areaId ?? ''} onChange={setAreaId} />
        </Field>
        <Field label="Status">
          <StatusSelect value={status} onChange={setStatus} />
        </Field>
        <Field label="Target date">
          <input
            className="input"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </Field>
        <Field label="Description">
          <textarea
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
