import { useState, type FormEvent } from 'react'

import { Check, Plus, Trash2 } from 'lucide-react'

import { journal } from '../api/hooks'
import { DraftAssist } from '../components/DraftAssist'
import { Modal } from '../components/Modal'
import { AreaSelect } from '../components/selects'
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, PageHeader, SkeletonText, Textarea, useConfirm } from '../components/ui'
import { MOOD_EMOJI, formatDay } from '../lib/format'

export function JournalPage() {
  const [areaFilter, setAreaFilter] = useState('')
  const { data, isPending, isError, error } = journal.useList(areaFilter ? `?areaId=${areaFilter}` : '')
  const create = journal.useCreate()
  const remove = journal.useRemove()
  const confirm = useConfirm()
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
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
            Entry
          </Button>
        }
      />
      <div className="filter-row area-filter">
        <span className="muted small">Area</span>
        <AreaSelect value={areaFilter} onChange={setAreaFilter} emptyLabel="All areas" />
      </div>
      {isPending && <SkeletonText lines={4} />}
      {isError && <p className="error">{(error as Error).message}</p>}
      {entries.length === 0 && <EmptyState message="No entries yet. Write your first." />}

      <div className="list">
        {entries.map((entry) => (
          <Card key={entry.id} className="row-between list-row">
            <div>
              <div className="row">
                <strong>{formatDay(entry.date)}</strong>
                {entry.mood != null && <span className="journal-mood">{MOOD_EMOJI[entry.mood]}</span>}
                {entry.moodSource === 'ai' && <Badge kind="muted">AI mood</Badge>}
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
            <IconButton
              label="Delete entry"
              danger
              onClick={async () => {
                if (await confirm({ title: 'Delete entry', message: 'Delete this journal entry?', danger: true, confirmLabel: 'Delete' }))
                  remove.mutate(entry.id)
              }}
            >
              <Trash2 size={14} />
            </IconButton>
          </Card>
        ))}
      </div>

      {open && (
        <JournalModal
          pending={create.isPending}
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
  pending,
}: {
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
  pending: boolean
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
    <Modal
      title="New journal entry"
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
        <Field label="What happened?">
          <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
          <DraftAssist
            value={content}
            onInsert={(text) => setContent((c) => (c.trim() ? `${c}\n\n${text}` : text))}
          />
        </Field>
        <Field label="Title (optional)">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={`Mood: ${MOOD_EMOJI[mood]}`}>
          <Input type="range" min={1} max={5} value={mood} onChange={(e) => setMood(Number(e.target.value))} />
        </Field>
      </form>
    </Modal>
  )
}
