import { useState, type FormEvent } from 'react'

import { tasks } from '../api/hooks'
import { Modal } from '../components/Modal'
import { AreaSelect, ProjectSelect } from '../components/selects'
import { EmptyState, Field, PageHeader } from '../components/ui'
import { QUADRANT_META, formatDate } from '../lib/format'
import type { Quadrant } from '../lib/types'

const QUADRANTS: Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4']

export function TasksPage() {
  const [areaFilter, setAreaFilter] = useState('')
  const { data, isPending, isError, error } = tasks.useList(areaFilter ? `?areaId=${areaFilter}` : '')
  const create = tasks.useCreate()
  const update = tasks.useUpdate()
  const remove = tasks.useRemove()
  const [open, setOpen] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const visible = (data ?? []).filter((t) => showCompleted || !t.completed)
  const byQuadrant = (q: Quadrant) => visible.filter((t) => t.quadrant === q)

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Eisenhower matrix — urgent × important"
        action={
          <div className="row">
            <label className="row small muted">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
              show completed
            </label>
            <button className="btn primary" onClick={() => setOpen(true)}>
              + Task
            </button>
          </div>
        }
      />
      <div className="filter-row area-filter">
        <span className="muted small">Area</span>
        <AreaSelect value={areaFilter} onChange={setAreaFilter} emptyLabel="All areas" />
      </div>
      {isPending && <p className="muted">Loading…</p>}
      {isError && <p className="error">{(error as Error).message}</p>}
      {data?.length === 0 && <EmptyState message="No tasks yet. Add your first." />}

      <div className="board">
        {QUADRANTS.map((q) => (
          <div key={q} className={`board-col ${q.toLowerCase()}`}>
            <div className="board-col-head">
              <strong>{QUADRANT_META[q].label}</strong>
              <span className="muted small">{QUADRANT_META[q].hint}</span>
            </div>
            {byQuadrant(q).map((task) => (
              <div key={task.id} className={`task-card${task.completed ? ' done' : ''}`}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() =>
                    update.mutate({ id: task.id, body: { completed: !task.completed } })
                  }
                />
                <div className="task-body">
                  <span className="task-title">{task.title}</span>
                  {task.dueDate && <span className="muted small">due {formatDate(task.dueDate)}</span>}
                </div>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (confirm('Delete task?')) remove.mutate(task.id)
                  }}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {open && (
        <TaskModal
          onClose={() => setOpen(false)}
          onSubmit={(body) => create.mutate(body, { onSuccess: () => setOpen(false) })}
        />
      )}
    </div>
  )
}

function TaskModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
}) {
  const [title, setTitle] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [important, setImportant] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      urgent,
      important,
      projectId: projectId || null,
      dueDate: dueDate || null,
    })
  }

  return (
    <Modal title="New task" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <div className="row">
          <label className="row small">
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            Urgent
          </label>
          <label className="row small">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
            />
            Important
          </label>
        </div>
        <Field label="Project">
          <ProjectSelect value={projectId} onChange={setProjectId} />
        </Field>
        <Field label="Due date">
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
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
