import { useMemo, useState, type FormEvent } from 'react'

import {
  BookMarked,
  ExternalLink,
  FileText,
  Library,
  Link2,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { areas } from '../api/hooks'
import { notes, useGenerateRollup, useRollups } from '../api/memory'
import { resources, useRefetchResource } from '../api/resources'
import { Modal } from '../components/Modal'
import { AreaSelect } from '../components/selects'
import { EmptyState, Field, PageHeader } from '../components/ui'
import { formatDay } from '../lib/format'
import type { Resource, ResourceKind, ResourceStatus } from '../lib/types'

type Tab = 'notes' | 'resources' | 'summaries'

const TABS: { key: Tab; label: string }[] = [
  { key: 'notes', label: 'Notes' },
  { key: 'resources', label: 'Resources' },
  { key: 'summaries', label: 'Daily summaries' },
]

export function MemoryPage() {
  const [tab, setTab] = useState<Tab>('notes')

  return (
    <div>
      <PageHeader title="Memory" subtitle="What Cortex remembers about you" />

      <div className="mem-tabs filter-row">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`chip${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'notes' && <NotesTab />}
      {tab === 'resources' && <ResourcesTab />}
      {tab === 'summaries' && <DailySummaries />}
    </div>
  )
}

function NotesTab() {
  const { data, isPending, isError, error } = notes.useList()
  const create = notes.useCreate()
  const update = notes.useUpdate()
  const remove = notes.useRemove()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="row-between section-bar">
        <span className="muted small">Facts &amp; preferences Cortex keeps about you</span>
        <button className="btn primary sm" onClick={() => setOpen(true)}>
          + Note
        </button>
      </div>

      {isPending && <p className="muted">Loading…</p>}
      {isError && <p className="error">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <EmptyState message="No memories yet. Add a note, or just chat — Cortex learns as you go." />
      )}

      <div className="list">
        {data?.map((note) => (
          <div key={note.id} className="card row-between note-card">
            <div className="note-body">
              {note.title && <strong>{note.title}</strong>}
              <p className="note-content">{note.content}</p>
              <span className={`badge ${note.source === 'chat' ? 'info' : 'muted'}`}>
                {note.source === 'chat' ? 'from chat' : 'note'}
              </span>
            </div>
            <div className="note-actions">
              <button
                className="icon-btn"
                title={note.pinned ? 'Unpin' : 'Pin'}
                onClick={() => update.mutate({ id: note.id, body: { pinned: !note.pinned } })}
                aria-label={note.pinned ? 'Unpin' : 'Pin'}
              >
                {note.pinned ? <Pin size={15} /> : <PinOff size={15} />}
              </button>
              <button
                className="icon-btn"
                onClick={() => {
                  if (confirm('Delete this memory?')) remove.mutate(note.id)
                }}
                aria-label="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <NoteModal
          onClose={() => setOpen(false)}
          onSubmit={(body) => create.mutate(body, { onSuccess: () => setOpen(false) })}
        />
      )}
    </>
  )
}

const KIND_META: Record<ResourceKind, { icon: LucideIcon; label: string }> = {
  link: { icon: Link2, label: 'Link' },
  document: { icon: FileText, label: 'Document' },
  book: { icon: BookMarked, label: 'Book' },
  prompt: { icon: Sparkles, label: 'Prompt' },
}

const STATUS_META: Record<ResourceStatus, { label: string; cls: string }> = {
  not_started: { label: 'Not started', cls: 'muted' },
  in_progress: { label: 'In progress', cls: 'info' },
  done: { label: 'Done', cls: 'done' },
  archived: { label: 'Archived', cls: 'muted' },
}

const KIND_FILTERS: { value: '' | ResourceKind; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'link', label: 'Links' },
  { value: 'document', label: 'Documents' },
  { value: 'book', label: 'Books' },
  { value: 'prompt', label: 'Prompts' },
]

const STATUS_FILTERS: { value: '' | ResourceStatus; label: string }[] = [
  { value: '', label: 'Any status' },
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
]

function ResourcesTab() {
  const { data, isPending, isError, error } = resources.useList()
  const create = resources.useCreate()
  const update = resources.useUpdate()
  const remove = resources.useRemove()
  const refetch = useRefetchResource()
  const { data: areaList } = areas.useList()

  const [kind, setKind] = useState<'' | ResourceKind>('')
  const [status, setStatus] = useState<'' | ResourceStatus>('')
  const [areaId, setAreaId] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Resource | 'new' | null>(null)

  // areaId → "code name" + color, including a lane's sub-areas for the family filter.
  const areaMap = useMemo(() => {
    const m = new Map<string, { label: string; color: string }>()
    for (const a of areaList ?? []) {
      m.set(a.id, { label: a.code ? `${a.code} ${a.name}` : a.name, color: a.color })
    }
    return m
  }, [areaList])

  const familyIds = useMemo(() => {
    if (!areaId) return null
    const ids = new Set<string>([areaId])
    for (const a of areaList ?? []) if (String(a.parentId) === areaId) ids.add(a.id)
    return ids
  }, [areaId, areaList])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter((r) => {
      if (kind && r.kind !== kind) return false
      if (status && r.status !== status) return false
      if (familyIds && !(r.areaId && familyIds.has(r.areaId))) return false
      if (q) {
        const hay = `${r.title} ${r.url ?? ''} ${r.content ?? ''} ${(r.tags ?? []).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data, kind, status, familyIds, search])

  return (
    <>
      <div className="row-between section-bar">
        <span className="muted small">Saved references — links, documents, books, reusable prompts</span>
        <button className="btn primary sm" onClick={() => setEditing('new')}>
          + Add resource
        </button>
      </div>

      <div className="resource-filters">
        <div className="filter-row">
          {KIND_FILTERS.map((k) => (
            <button
              key={k.value}
              className={`chip${kind === k.value ? ' active' : ''}`}
              onClick={() => setKind(k.value)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="resource-filters-row">
          <select
            className="input sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | ResourceStatus)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <AreaSelect value={areaId} onChange={setAreaId} emptyLabel="— Any area —" />
          <input
            className="input sm"
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isPending && <p className="muted">Loading…</p>}
      {isError && <p className="error">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <EmptyState message="No resources yet. Save a link, a book to read, or a reusable prompt." />
      )}
      {data && data.length > 0 && filtered.length === 0 && (
        <p className="muted small">No resources match these filters.</p>
      )}

      <div className="resource-grid">
        {filtered.map((r) => (
          <ResourceCard
            key={r.id}
            resource={r}
            area={r.areaId ? areaMap.get(r.areaId) : undefined}
            onEdit={() => setEditing(r)}
            onTogglePin={() => update.mutate({ id: r.id, body: { pinned: !r.pinned } })}
            onRefetch={() => refetch.mutate(r.id)}
            onDelete={() => {
              if (confirm('Delete this resource?')) remove.mutate(r.id)
            }}
          />
        ))}
      </div>

      {editing && (
        <ResourceModal
          resource={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={(body) => {
            if (editing === 'new') {
              create.mutate(body, { onSuccess: () => setEditing(null) })
            } else {
              update.mutate({ id: editing.id, body }, { onSuccess: () => setEditing(null) })
            }
          }}
        />
      )}
    </>
  )
}

function ResourceCard({
  resource: r,
  area,
  onEdit,
  onTogglePin,
  onRefetch,
  onDelete,
}: {
  resource: Resource
  area?: { label: string; color: string }
  onEdit: () => void
  onTogglePin: () => void
  onRefetch: () => void
  onDelete: () => void
}) {
  const km = KIND_META[r.kind]
  const sm = STATUS_META[r.status]
  const Icon = km.icon
  const hasUrl = Boolean(r.url)

  return (
    <div className="card resource-card">
      <div className="resource-head">
        <span className="resource-kind" title={km.label}>
          <Icon size={15} />
        </span>
        <span className="resource-title">
          {hasUrl ? (
            <a href={r.url} target="_blank" rel="noreferrer">
              {r.title} <ExternalLink size={12} />
            </a>
          ) : (
            r.title
          )}
        </span>
        <button
          className="icon-btn"
          title={r.pinned ? 'Unpin' : 'Pin'}
          aria-label={r.pinned ? 'Unpin' : 'Pin'}
          onClick={onTogglePin}
        >
          {r.pinned ? <Pin size={14} /> : <PinOff size={14} />}
        </button>
      </div>

      <div className="resource-meta">
        <span className={`badge ${sm.cls}`}>{sm.label}</span>
        {area && (
          <span className="resource-area">
            <span className="dot" style={{ background: area.color }} /> {area.label}
          </span>
        )}
      </div>

      {r.content && <p className="resource-content">{r.content}</p>}
      {!r.content && r.fetch?.excerpt && <p className="resource-content muted">{r.fetch.excerpt}</p>}

      {r.tags && r.tags.length > 0 && (
        <div className="resource-tags">
          {r.tags.map((t) => (
            <span key={t} className="tag-chip">
              #{t}
            </span>
          ))}
        </div>
      )}

      {hasUrl && (
        <div className="resource-fetch small muted">
          {r.fetch?.status === 'fetched' &&
            `Saved${r.fetch.siteName ? ` from ${r.fetch.siteName}` : ''} · extracted`}
          {r.fetch?.status === 'failed' && `Couldn’t fetch: ${r.fetch.error ?? 'unknown'}`}
          {(!r.fetch || r.fetch.status === 'idle') && 'Link saved'}
        </div>
      )}

      <div className="resource-actions">
        {hasUrl && (
          <button className="btn ghost sm" onClick={onRefetch} title="Re-fetch the page text">
            <RefreshCw size={13} /> Refetch
          </button>
        )}
        <button className="btn ghost sm" onClick={onEdit}>
          <Pencil size={13} /> Edit
        </button>
        <button className="btn ghost sm" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  )
}

function ResourceModal({
  resource,
  onClose,
  onSubmit,
}: {
  resource: Resource | null
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
}) {
  const [kind, setKind] = useState<ResourceKind>(resource?.kind ?? 'link')
  const [title, setTitle] = useState(resource?.title ?? '')
  const [url, setUrl] = useState(resource?.url ?? '')
  const [content, setContent] = useState(resource?.content ?? '')
  const [areaId, setAreaId] = useState(resource?.areaId ?? '')
  const [tags, setTags] = useState((resource?.tags ?? []).join(', '))
  const [status, setStatus] = useState<ResourceStatus>(resource?.status ?? 'not_started')

  const urlKind = kind === 'link' || kind === 'document'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onSubmit({
      kind,
      title: title.trim(),
      url: urlKind && url.trim() ? url.trim() : null,
      content: content.trim() || null,
      areaId: areaId || null,
      tags: tagList.length ? tagList : undefined,
      status,
    })
  }

  return (
    <Modal title={resource ? 'Edit resource' : 'New resource'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Kind">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)}>
            <option value="link">Link</option>
            <option value="document">Document</option>
            <option value="book">Book</option>
            <option value="prompt">Prompt / PRD</option>
          </select>
        </Field>
        <Field label="Title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        {urlKind && (
          <Field label="URL">
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        )}
        <Field label={urlKind ? 'Notes (optional)' : 'Content'}>
          <textarea
            className="input"
            rows={urlKind ? 2 : 5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={urlKind ? 'Why you saved it…' : 'Paste the prompt / PRD / reference text…'}
          />
        </Field>
        <Field label="Area">
          <AreaSelect value={areaId ?? ''} onChange={setAreaId} />
        </Field>
        <div className="row">
          <Field label="Status">
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as ResourceStatus)}
            >
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Tags (comma-separated)">
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
        </div>
        {urlKind && (
          <p className="muted small">
            <Library size={12} /> Saving a URL fetches the page text so it’s searchable in chat.
          </p>
        )}
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

function DailySummaries() {
  const { data } = useRollups()
  const generate = useGenerateRollup()
  const [note, setNote] = useState<string | null>(null)

  const onGenerate = () => {
    generate.mutate(undefined, {
      onSuccess: (res) => {
        setNote(
          res.skipped
            ? 'Nothing recorded today yet — complete a task, log a habit or journal first.'
            : null,
        )
      },
    })
  }

  return (
    <section className="memory-section">
      <header className="memory-section-head">
        <h2>Daily summaries</h2>
        <button className="btn ghost sm" onClick={onGenerate} disabled={generate.isPending}>
          <Sparkles size={14} />
          {generate.isPending ? 'Summarizing…' : 'Generate today'}
        </button>
      </header>
      {note && <p className="muted">{note}</p>}
      {data && data.length === 0 && !note && (
        <EmptyState message="No daily summaries yet. Generate one to capture your day." />
      )}
      <div className="list">
        {data?.map((r) => (
          <div key={r.id} className="card">
            <strong>{formatDay(r.date)}</strong>
            <p className="note-content">{r.summary}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function NoteModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void
}) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    onSubmit({ content: content.trim(), title: title.trim() || undefined })
  }

  return (
    <Modal title="New memory" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="What should Cortex remember?">
          <textarea
            className="input"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Title (optional)">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
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
