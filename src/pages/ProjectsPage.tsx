import { useState, type FormEvent } from 'react'

import { projects } from '../api/hooks'
import { Modal } from '../components/Modal'
import { AreaSelect, GoalSelect, StatusSelect } from '../components/selects'
import { EmptyState, Field, PageHeader, StatusBadge } from '../components/ui'
import { formatDate } from '../lib/format'
import type { Project, Status } from '../lib/types'

export function ProjectsPage() {
  const [areaFilter, setAreaFilter] = useState('')
  const { data, isPending, isError, error } = projects.useList(areaFilter ? `?areaId=${areaFilter}` : '')
  const create = projects.useCreate()
  const update = projects.useUpdate()
  const remove = projects.useRemove()
  const [editing, setEditing] = useState<Project | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Concrete efforts in motion"
        action={
          <button
            className="btn primary"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            + Project
          </button>
        }
      />
      <div className="filter-row area-filter">
        <span className="muted small">Area</span>
        <AreaSelect value={areaFilter} onChange={setAreaFilter} emptyLabel="All areas" />
      </div>
      {isPending && <p className="muted">Loading…</p>}
      {isError && <p className="error">{(error as Error).message}</p>}
      {data?.length === 0 && <EmptyState message="No projects yet." />}

      <div className="list">
        {data?.map((project) => (
          <div key={project.id} className="card row-between">
            <div>
              <div className="row">
                <strong>{project.title}</strong>
                <StatusBadge status={project.status} />
                {project.overdue && <span className="badge bad">overdue</span>}
                {project.stagnant && <span className="badge warn">stagnant</span>}
              </div>
              <p className="muted small">
                ⚖️ weight {project.weight}
                {project.dueDate && <> · due {formatDate(project.dueDate)}</>}
              </p>
              {project.description && <p className="muted">{project.description}</p>}
            </div>
            <div className="card-actions">
              <button
                className="btn ghost"
                onClick={() => {
                  setEditing(project)
                  setOpen(true)
                }}
              >
                Edit
              </button>
              <button
                className="btn ghost danger"
                onClick={() => {
                  if (confirm(`Delete project "${project.title}"?`)) remove.mutate(project.id)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <ProjectModal
          project={editing}
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
}: {
  project: Project | null
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
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
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
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
          <input
            className="input"
            type="range"
            min={1}
            max={10}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
          />
        </Field>
        <Field label="Due date">
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
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
