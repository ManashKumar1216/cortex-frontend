import { useState } from 'react'

import { CalendarClock, CheckSquare, Bell, Sparkles, Trash2 } from 'lucide-react'

import { useCommitDump, useOrganizeDump } from '../api/braindump'
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Textarea } from '../components/ui'
import type { DumpItem, DumpItemType } from '../lib/types'

interface EditItem extends DumpItem {
  include: boolean
}

const TYPE_META: Record<DumpItemType, { label: string; icon: typeof CheckSquare }> = {
  task: { label: 'Task', icon: CheckSquare },
  reminder: { label: 'Reminder', icon: Bell },
  event: { label: 'Event', icon: CalendarClock },
}

const pad = (n: number): string => String(n).padStart(2, '0')
/** ISO → value for <input type="datetime-local"> (local time, minute precision). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocalInput(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function BrainDumpPage() {
  const [text, setText] = useState('')
  const [items, setItems] = useState<EditItem[] | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const organize = useOrganizeDump()
  const commit = useCommitDump()

  const onOrganize = () => {
    setDone(null)
    organize.mutate(text, {
      onSuccess: (res) => setItems(res.map((it) => ({ ...it, include: true }))),
    })
  }

  const patch = (i: number, p: Partial<EditItem>) =>
    setItems((cur) => cur && cur.map((it, idx) => (idx === i ? { ...it, ...p } : it)))
  const removeRow = (i: number) => setItems((cur) => cur && cur.filter((_, idx) => idx !== i))

  const onCommit = () => {
    const chosen = (items ?? []).filter((it) => it.include).map(({ include: _i, ...rest }) => rest)
    if (!chosen.length) return
    commit.mutate(chosen, {
      onSuccess: (res) => {
        setDone(`Added ${res.created} item${res.created === 1 ? '' : 's'} to your plan.`)
        setItems(null)
        setText('')
      },
    })
  }

  const selectedCount = (items ?? []).filter((it) => it.include).length

  return (
    <div>
      <PageHeader
        title="Brain dump"
        subtitle="Empty your head — Cortex sorts it into tasks, reminders, and events for you to confirm."
      />

      {done && <p className="braindump-done">{done}</p>}

      <Card>
        <Field label="Dump everything on your mind">
          <Textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'e.g. call the dentist tomorrow, finish the Q3 deck by Friday, team sync Thursday 3pm, buy milk…'}
            autoFocus
          />
        </Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            loading={organize.isPending}
            icon={<Sparkles size={14} />}
            onClick={onOrganize}
            disabled={text.trim().length < 4}
          >
            {organize.isPending ? 'Organizing…' : 'Organize'}
          </Button>
        </div>
      </Card>

      {organize.isError && <p className="error">Could not organize that. Try again.</p>}

      {items && items.length === 0 && (
        <EmptyState message="Nothing to schedule in there — try adding a few concrete to-dos or times." />
      )}

      {items && items.length > 0 && (
        <div className="braindump-review">
          <div className="row-between section-bar">
            <span className="muted small">
              Review &amp; edit — nothing is saved until you confirm. {selectedCount} selected.
            </span>
            <Button
              variant="primary"
              loading={commit.isPending}
              onClick={onCommit}
              disabled={!selectedCount}
            >
              {commit.isPending ? 'Adding…' : `Add ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
            </Button>
          </div>

          <div className="list">
            {items.map((it, i) => {
              const Icon = TYPE_META[it.type].icon
              return (
                <div key={i} className={`card braindump-row${it.include ? '' : ' excluded'}`}>
                  <input
                    type="checkbox"
                    checked={it.include}
                    onChange={(e) => patch(i, { include: e.target.checked })}
                    aria-label="Include this item"
                  />
                  <div className="braindump-fields">
                    <div className="braindump-row-top">
                      <select
                        className="input braindump-type"
                        value={it.type}
                        onChange={(e) => patch(i, { type: e.target.value as DumpItemType })}
                      >
                        <option value="task">Task</option>
                        <option value="reminder">Reminder</option>
                        <option value="event">Event</option>
                      </select>
                      <Input
                        value={it.title}
                        onChange={(e) => patch(i, { title: e.target.value })}
                        placeholder="Title"
                      />
                      <Badge kind="muted">
                        <Icon size={12} /> {TYPE_META[it.type].label}
                      </Badge>
                    </div>
                    <div className="braindump-row-when">
                      <input
                        type="datetime-local"
                        className="input"
                        value={toLocalInput(it.when)}
                        onChange={(e) => patch(i, { when: fromLocalInput(e.target.value) })}
                      />
                      {it.type === 'task' && <span className="muted small">due date (optional)</span>}
                      {it.type === 'event' && (
                        <label className="row" style={{ gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={Boolean(it.allDay)}
                            onChange={(e) => patch(i, { allDay: e.target.checked })}
                          />
                          <span className="muted small">all-day</span>
                        </label>
                      )}
                    </div>
                    {it.notes && <p className="muted small braindump-notes">{it.notes}</p>}
                  </div>
                  <button
                    className="icon-btn"
                    title="Remove"
                    aria-label="Remove item"
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
