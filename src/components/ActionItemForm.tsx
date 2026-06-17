import { useState } from 'react'

import type { DumpItem, DumpItemType } from '../lib/types'

const TYPES: { value: DumpItemType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'event', label: 'Event' },
]

/** ISO → value for a <input type="datetime-local"> (local time, no seconds). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local value → ISO string (or null when empty/invalid). */
function fromLocalInput(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Inline editor for turning a review item (WhatsApp suggestion, triaged email)
 * into a task / reminder / event. The owner can retype, retitle, reschedule, and
 * annotate before it's created — nothing is written until they confirm.
 */
export function ActionItemForm({
  initial,
  onSubmit,
  onCancel,
  busy = false,
  submitLabel = 'Add',
}: {
  initial: Partial<DumpItem>
  onSubmit: (item: DumpItem) => void
  onCancel?: () => void
  busy?: boolean
  submitLabel?: string
}) {
  const [type, setType] = useState<DumpItemType>(initial.type ?? 'task')
  const [title, setTitle] = useState(initial.title ?? '')
  const [when, setWhen] = useState(toLocalInput(initial.when ?? null))
  const [notes, setNotes] = useState(initial.notes ?? '')

  const whenLabel = type === 'task' ? 'Due (optional)' : type === 'reminder' ? 'Remind at' : 'Starts'

  function submit() {
    const t = title.trim()
    if (!t) return
    onSubmit({ type, title: t, when: fromLocalInput(when), notes: notes.trim() || undefined })
  }

  return (
    <div className="action-form">
      <div className="action-form-types" role="group" aria-label="Create as">
        {TYPES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`chip${type === opt.value ? ' active' : ''}`}
            onClick={() => setType(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <input
        className="action-form-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        aria-label="Title"
      />
      <label className="action-form-when">
        <span className="muted small">{whenLabel}</span>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      <textarea
        className="action-form-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
      />
      <div className="action-form-foot">
        <button className="btn primary sm" onClick={submit} disabled={busy || !title.trim()}>
          {submitLabel}
        </button>
        {onCancel && (
          <button className="btn ghost sm" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
