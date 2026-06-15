import { useState, type FormEvent } from 'react'

import { Check, FolderOpen, Pencil, Plus, Target, Trash2 } from 'lucide-react'

import { areas, goals } from '../api/hooks'
import { Modal } from '../components/Modal'
import { AreaSelect, StatusSelect } from '../components/selects'
import { Button, Card, EmptyState, Field, Input, PageHeader, SkeletonText, StatusBadge, Textarea, useConfirm } from '../components/ui'
import { formatDate } from '../lib/format'
import type { Goal, Status } from '../lib/types'

export function GoalsPage() {
  const [areaFilter, setAreaFilter] = useState('')
  const { data, isPending, isError, error } = goals.useList(areaFilter ? `?areaId=${areaFilter}` : '')
  const areaList = areas.useList()
  const create = goals.useCreate()
  const update = goals.useUpdate()
  const remove = goals.useRemove()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Goal | null>(null)
  const [open, setOpen] = useState(false)

  const areaName = (id?: string | null) => areaList.data?.find((a) => a.id === id)?.name

  return (
    <div>
      <PageHeader
        title="Goals"
        subtitle="What you're working toward"
        action={
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            Goal
          </Button>
        }
      />
      <div className="filter-row area-filter">
        <span className="muted small">Area</span>
        <AreaSelect value={areaFilter} onChange={setAreaFilter} emptyLabel="All areas" />
      </div>
      {isPending && <SkeletonText lines={3} />}
      {isError && <p className="error">{(error as Error).message}</p>}
      {data?.length === 0 && <EmptyState message="No goals yet." />}

      <div className="list">
        {data?.map((goal) => (
          <Card key={goal.id} className="row-between list-row">
            <div>
              <div className="row">
                <strong>{goal.title}</strong>
                <StatusBadge status={goal.status} />
              </div>
              <p className="muted small meta-line">
                {areaName(goal.areaId) && (
                  <>
                    <FolderOpen size={12} /> {areaName(goal.areaId)} ·{' '}
                  </>
                )}
                {goal.targetDate ? (
                  <>
                    <Target size={12} /> {formatDate(goal.targetDate)}
                  </>
                ) : (
                  'no target date'
                )}
              </p>
              {goal.description && <p className="muted">{goal.description}</p>}
            </div>
            <div className="card-actions">
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil size={13} />}
                onClick={() => {
                  setEditing(goal)
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
                  if (await confirm({ title: 'Delete goal', message: `Delete "${goal.title}"?`, danger: true, confirmLabel: 'Delete' }))
                    remove.mutate(goal.id)
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {open && (
        <GoalModal
          goal={editing}
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

function GoalModal({
  goal,
  onClose,
  onSubmit,
  pending,
}: {
  goal: Goal | null
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
  pending: boolean
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
    <Modal
      title={goal ? 'Edit goal' : 'New goal'}
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
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Area">
          <AreaSelect value={areaId ?? ''} onChange={setAreaId} />
        </Field>
        <Field label="Status">
          <StatusSelect value={status} onChange={setStatus} />
        </Field>
        <Field label="Target date">
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
