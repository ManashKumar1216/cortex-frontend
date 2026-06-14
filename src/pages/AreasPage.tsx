import { useMemo, useState, type FormEvent } from 'react'

import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { areas } from '../api/hooks'
import { Modal } from '../components/Modal'
import { EmptyState, Field, PageHeader } from '../components/ui'
import type { Area } from '../lib/types'

export function AreasPage() {
  const { data, isPending, isError, error } = areas.useList()
  const create = areas.useCreate()
  const update = areas.useUpdate()
  const remove = areas.useRemove()
  const navigate = useNavigate()

  const [modal, setModal] = useState<{ area: Area | null; parentId: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const list = data ?? []
  const lanes = useMemo(() => list.filter((a) => !a.parentId), [list])
  const subsOf = (laneId: string) => list.filter((a) => String(a.parentId) === laneId)
  const childCount = (id: string) => list.filter((a) => String(a.parentId) === id).length

  const onDelete = (area: Area) => {
    if (!confirm(`Delete "${area.name}"?`)) return
    setActionError(null)
    remove.mutate(area.id, { onError: (e) => setActionError((e as Error).message) })
  }

  const submit = (body: Record<string, unknown>) => {
    setActionError(null)
    const onError = (e: unknown) => setActionError((e as Error).message)
    const onSuccess = () => setModal(null)
    if (modal?.area) update.mutate({ id: modal.area.id, body }, { onSuccess, onError })
    else create.mutate(body, { onSuccess, onError })
  }

  return (
    <div>
      <PageHeader
        title="Areas"
        subtitle="The lanes of your life — and the sub-areas everything files under"
        action={
          <button className="btn primary" onClick={() => setModal({ area: null, parentId: '' })}>
            <Plus size={15} /> Lane
          </button>
        }
      />

      {isPending && <p className="muted">Loading…</p>}
      {isError && <p className="error">{(error as Error).message}</p>}
      {actionError && <p className="error">{actionError}</p>}
      {data && lanes.length === 0 && <EmptyState message="No areas yet. Add your first lane." />}

      <div className="area-tree">
        {lanes.map((lane) => (
          <div key={lane.id} className="area-lane">
            <div className="area-row lane">
              <span className="dot" style={{ background: lane.color }} />
              <span className="area-code mono">{lane.code}</span>
              <button className="area-name" onClick={() => navigate(`/areas/${lane.id}`)}>
                {lane.name} <ChevronRight size={13} />
              </button>
              <div className="area-row-actions">
                <button className="btn ghost sm" onClick={() => setModal({ area: null, parentId: lane.id })}>
                  <Plus size={13} /> Sub-area
                </button>
                <button className="icon-btn" aria-label="Edit" onClick={() => setModal({ area: lane, parentId: '' })}>
                  <Pencil size={14} />
                </button>
                <button className="icon-btn" aria-label="Delete" onClick={() => onDelete(lane)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {subsOf(lane.id).map((sub) => (
              <div key={sub.id} className="area-row sub">
                <span className="area-code mono">{sub.code}</span>
                <button className="area-name" onClick={() => navigate(`/areas/${sub.id}`)}>
                  {sub.name} <ChevronRight size={13} />
                </button>
                <div className="area-row-actions">
                  <button
                    className="icon-btn"
                    aria-label="Edit"
                    onClick={() => setModal({ area: sub, parentId: lane.id })}
                  >
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn" aria-label="Delete" onClick={() => onDelete(sub)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {modal && (
        <AreaModal
          area={modal.area}
          presetParentId={modal.parentId}
          lanes={lanes}
          hasChildren={modal.area ? childCount(modal.area.id) > 0 : false}
          onClose={() => setModal(null)}
          onSubmit={submit}
        />
      )}
    </div>
  )
}

function AreaModal({
  area,
  presetParentId,
  lanes,
  hasChildren,
  onClose,
  onSubmit,
}: {
  area: Area | null
  presetParentId: string
  lanes: Area[]
  hasChildren: boolean
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
}) {
  const origParent = area ? (area.parentId ? String(area.parentId) : '') : presetParentId
  const origCode = area?.code ?? ''
  const [name, setName] = useState(area?.name ?? '')
  const [code, setCode] = useState(origCode)
  const [color, setColor] = useState(area?.color ?? '#7fb0a0')
  const [description, setDescription] = useState(area?.description ?? '')
  const [parentId, setParentId] = useState(origParent)

  const isLaneNow = !parentId
  const laneOptions = lanes.filter((l) => l.id !== area?.id) // can't parent under self

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const body: Record<string, unknown> = {
      name: name.trim(),
      color,
      description: description.trim() || undefined,
    }
    // Only send code when the user actually changed it (sending a code marks it manual).
    if (code.trim() !== origCode) body.code = code.trim() || undefined
    // parentId drives create placement and edit moves (service no-ops if unchanged).
    body.parentId = parentId || null
    onSubmit(body)
  }

  const title = area ? `Edit ${area.parentId ? 'sub-area' : 'lane'}` : presetParentId ? 'New sub-area' : 'New lane'

  return (
    <Modal title={title} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Parent lane">
          <select
            className="input"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            disabled={hasChildren}
          >
            <option value="">— Top level (lane) —</option>
            {laneOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} {l.name}
              </option>
            ))}
          </select>
        </Field>
        {hasChildren && (
          <p className="muted small">
            This lane has sub-areas, so it can’t become a sub-area. Move or remove them first.
          </p>
        )}
        <Field label="Code (optional — auto-assigned if blank)">
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={isLaneNow ? 'e.g. A' : 'e.g. A.1'}
          />
        </Field>
        <Field label="Color">
          <input className="input color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
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
