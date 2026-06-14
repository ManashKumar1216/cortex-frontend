import { useState, type FormEvent } from 'react'

import { journal } from '../api/hooks'
import { Modal } from '../components/Modal'
import { AreaSelect } from '../components/selects'
import { EmptyState, Field, PageHeader } from '../components/ui'
import { MOOD_EMOJI, formatDay } from '../lib/format'

export function JournalPage() {
  const [areaFilter, setAreaFilter] = useState('')
  const { data, isPending, isError, error } = journal.useList(areaFilter ? `?areaId=${areaFilter}` : '')
  const create = journal.useCreate()
  const remove = journal.useRemove()
  const [open, setOpen] = useState(false)

  // Newest first by date then creation time.
  const entries = [...(data ?? [])].sort((a, b) =>
    b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
  )

  return (
    <div>
      <PageHeader
        title="Journal"
        subtitle="A line a day"
        action={
          <button className="btn primary" onClick={() => setOpen(true)}>
            + Entry
          </button>
        }
      />
      <div className="filter-row area-filter">
        <span className="muted small">Area</span>
        <AreaSelect value={areaFilter} onChange={setAreaFilter} emptyLabel="All areas" />
      </div>
      {isPending && <p className="muted">Loading…</p>}
      {isError && <p className="error">{(error as Error).message}</p>}
      {entries.length === 0 && <EmptyState message="No entries yet. Write your first." />}

      <div className="list">
        {entries.map((entry) => (
          <div key={entry.id} className="card row-between">
            <div>
              <div className="row">
                <strong>{formatDay(entry.date)}</strong>
                {entry.mood != null && <span>{MOOD_EMOJI[entry.mood]}</span>}
                {entry.moodSource === 'ai' && <span className="badge muted">AI mood</span>}
                {entry.title && <span className="muted">— {entry.title}</span>}
              </div>
              {entry.aiSummary && <p className="journal-summary">{entry.aiSummary}</p>}
              <p className="journal-content">{entry.content}</p>
              {entry.themes && entry.themes.length > 0 && (
                <div className="theme-row">
                  {entry.themes.map((t) => (
                    <span key={t} className="theme-chip">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              className="icon-btn"
              onClick={() => {
                if (confirm('Delete entry?')) remove.mutate(entry.id)
              }}
              aria-label="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {open && (
        <JournalModal
          onClose={() => setOpen(false)}
          onSubmit={(body) => create.mutate(body, { onSuccess: () => setOpen(false) })}
        />
      )}
    </div>
  )
}

function JournalModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
}) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [mood, setMood] = useState(3)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    onSubmit({ content: content.trim(), title: title.trim() || undefined, mood })
  }

  return (
    <Modal title="New journal entry" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="What happened?">
          <textarea
            className="input"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Title (optional)">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={`Mood: ${MOOD_EMOJI[mood]}`}>
          <input
            className="input"
            type="range"
            min={1}
            max={5}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
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
