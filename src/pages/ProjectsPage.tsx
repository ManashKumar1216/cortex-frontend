import { useState, type FormEvent } from 'react'

import { Check, Pencil, Plus, Scale, Trash2 } from 'lucide-react'

import { projects } from '../api/hooks'
import { Modal } from '../components/Modal'
import { AreaSelect, GoalSelect, StatusSelect } from '../components/selects'
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, SkeletonText, Textarea, useConfirm } from '../components/ui'
import { formatDate } from '../lib/format'
import type { Project, Status } from '../lib/types'

function railColor(p: Project): string {
  if (p.overdue) return 'var(--danger)'
  if (p.stagnant) return 'var(--warning)'
  if (p.status === 'active') return 'var(--success)'
  return 'var(--border-strong)'
}

export function ProjectsPage() {
  const [areaFilter, setAreaFilter] = useState('')
  const { data, isPending, isError, error } = projects.useList(areaFilter ? `?areaId=${areaFilter}` : '')
  const create = projects.useCreate()
  const update = projects.useUpdate()
  const remove = projects.useRemove()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Project | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Concrete efforts in motion"
        action={
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            Project
          </Button>
        }
      />
      <div className="filter-row area-filter">
        <span className="muted small">Area</span>
        <AreaSelect value={areaFilter} onChange={setAreaFilter} emptyLabel="All areas" />
      </div>
      {isPending && <SkeletonText lines={3} />}
      {isError && <p className="error">{(error as Error).message}</p>}
      {data?.length === 0 && <EmptyState message="No projects yet." />}

      <div className="list">
        {data?.map((project) => (
          <Card key={project.id} className="row-between list-row" style={{ borderLeft: `2px solid ${railColor(project)}` }}>
            <div>
              <div className="row">
                <strong>{project.title}</strong>
                <Badge kind={project.status === 'active' ? 'ok' : project.status === 'done' ? 'done' : 'muted'}>
                  {project.status}
                </Badge>
                {project.overdue && <Badge kind="bad">overdue</Badge>}
                {project.stagnant && <Badge kind="warn">stagnant</Badge>}
              </div>
              <p className="muted small meta-line">
                <Scale size={12} /> weight {project.weight}
                {project.dueDate && <> · due {formatDate(project.dueDate)}</>}
              </p>
              {project.description && <p className="muted">{project.description}</p>}
            </div>
            <div className="card-actions">
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil size={13} />}
                onClick={() => {
                  setEditing(project)
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
                  if (await confirm({ title: 'Delete project', message: `Delete "${project.title}"?`, danger: true, confirmLabel: 'Delete' }))
                    remove.mutate(project.id)
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {open && (
        <ProjectModal
          project={editing}
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

function ProjectModal({
  project,
  onClose,
  onSubmit,
  pending,
}: {
  project: Project | null
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
  pending: boolean
}) {
  const [title, setTitle] = useState(project?.title ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [goalId, setGoalId] = useState(project?.goalId ?? '')
  const [areaId, setAreaId] = useState(project?.areaId ?? '')
  const [status, setStatus] = useState<Status>(project?.status ?? 'active')
  const [weight, setWeight] = useState(project?.weight ?? 5)
  const [dueDate, setDueDate] = useState(project?.dueDate?.slice(0, 10) ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      goalId: goalId || null,
      areaId: areaId || null,
      status,
      weight,
      dueDate: dueDate || null,
    })
  }

  return (
    <Modal
      title={project ? 'Edit project' : 'New project'}
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
        <Field label="Goal">
          <GoalSelect value={goalId ?? ''} onChange={setGoalId} />
        </Field>
        <Field label="Area">
          <AreaSelect value={areaId ?? ''} onChange={setAreaId} />
        </Field>
        <Field label="Status">
          <StatusSelect value={status} onChange={setStatus} />
        </Field>
        <Field label={`Life-impact weight: ${weight}`}>
          <Input type="range" min={1} max={10} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
