import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Camera,
  Check,
  CheckSquare,
  Clock,
  Library,
  Link2,
  Loader,
  Mic,
  Pencil,
  Phone,
  Play,
  Square,
  StickyNote,
  Trash2,
  Type,
  X,
  type LucideIcon,
} from 'lucide-react'

import {
  captureMediaUrl,
  useAcceptCallItem,
  useAcceptCapture,
  useBulkCapture,
  useCaptures,
  useCaptureCall,
  useCaptureLink,
  useCapturePhoto,
  useCaptureText,
  useCaptureVoice,
  useDeleteCapture,
  useDismissCallItem,
  useDismissCapture,
  useSaveCallNote,
} from '../api/capture'
import { Modal } from '../components/Modal'
import { AreaSelect } from '../components/selects'
import { EmptyState, Field, PageHeader } from '../components/ui'
import { startRecording, type Recorder } from '../lib/recorder'
import type { Capture, CallActionItem } from '../lib/types'

type Mode = 'text' | 'voice' | 'link' | 'photo' | 'call'
const MODES: { key: Mode; label: string; icon: LucideIcon }[] = [
  { key: 'text', label: 'Text', icon: Type },
  { key: 'voice', label: 'Voice', icon: Mic },
  { key: 'link', label: 'Link', icon: Link2 },
  { key: 'photo', label: 'Photo', icon: Camera },
  { key: 'call', label: 'Call', icon: Phone },
]

type EntityType = 'task' | 'note' | 'journal' | 'resource'

const TYPE_META: Record<string, { icon: LucideIcon; label: string }> = {
  task: { icon: CheckSquare, label: 'Task' },
  note: { icon: StickyNote, label: 'Note' },
  journal: { icon: BookOpen, label: 'Journal' },
  resource: { icon: Library, label: 'Resource' },
  command: { icon: Play, label: 'Command' },
}

const RESOURCE_KINDS: { value: string; label: string }[] = [
  { value: 'link', label: 'Link' },
  { value: 'document', label: 'Document' },
  { value: 'book', label: 'Book' },
  { value: 'prompt', label: 'Prompt / PRD' },
]

const sval = (f: Record<string, unknown>, k: string): string =>
  typeof f[k] === 'string' ? (f[k] as string) : ''

export function CapturePage() {
  const [mode, setMode] = useState<Mode>('text')
  const captures = useCaptures()
  const bulk = useBulkCapture()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const inbox = useMemo(
    () => (captures.data ?? []).filter((c) => c.status !== 'accepted' && c.status !== 'dismissed'),
    [captures.data],
  )
  const suggestedSimple = inbox.filter(
    (c) => c.status === 'suggested' && c.kind !== 'call' && c.suggestion?.entityType !== 'command',
  )

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const runBulk = (action: 'accept' | 'dismiss' | 'delete') => {
    const ids = [...selected]
    if (!ids.length) return
    if (action === 'delete' && !confirm(`Delete ${ids.length} capture(s)?`)) return
    bulk.mutate({ ids, action }, { onSuccess: () => setSelected(new Set()) })
  }

  const acceptAllSuggested = () => {
    const ids = suggestedSimple.map((c) => c.id)
    if (ids.length) bulk.mutate({ ids, action: 'accept' })
  }

  return (
    <div>
      <PageHeader title="Capture" subtitle="Dump a thought — Cortex files it for you" />

      {/* Mode switcher */}
      <div className="capture-tabs filter-row">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`chip${mode === m.key ? ' active' : ''}`}
            onClick={() => setMode(m.key)}
          >
            <m.icon size={14} /> {m.label}
          </button>
        ))}
      </div>

      {mode === 'text' && <TextPanel />}
      {mode === 'voice' && <VoicePanel />}
      {mode === 'link' && <LinkPanel />}
      {mode === 'photo' && <PhotoPanel />}
      {mode === 'call' && <CallPanel />}

      {captures.isError && <p className="error">{(captures.error as Error).message}</p>}

      {/* Inbox toolbar */}
      {inbox.length > 0 && (
        <div className="capture-inbox-bar row-between">
          <span className="muted small">
            {selected.size > 0 ? `${selected.size} selected` : `${inbox.length} in inbox`}
          </span>
          <div className="bulk-actions">
            {selected.size > 0 ? (
              <>
                <button className="btn ghost sm" disabled={bulk.isPending} onClick={() => runBulk('accept')}>
                  <Check size={13} /> Accept
                </button>
                <button className="btn ghost sm" disabled={bulk.isPending} onClick={() => runBulk('dismiss')}>
                  <X size={13} /> Dismiss
                </button>
                <button className="btn ghost sm" disabled={bulk.isPending} onClick={() => runBulk('delete')}>
                  <Trash2 size={13} /> Delete
                </button>
                <button className="btn ghost sm" onClick={() => setSelected(new Set())}>
                  Clear
                </button>
              </>
            ) : (
              suggestedSimple.length > 0 && (
                <button className="btn ghost sm" disabled={bulk.isPending} onClick={acceptAllSuggested}>
                  <Check size={13} /> Accept all suggested ({suggestedSimple.length})
                </button>
              )
            )}
          </div>
        </div>
      )}

      {inbox.length === 0 && captures.isSuccess && (
        <EmptyState message="Inbox zero. Capture a thought above and it'll show up here." />
      )}

      <div className="list">
        {inbox.map((c) => (
          <CaptureCard
            key={c.id}
            capture={c}
            selected={selected.has(c.id)}
            onToggleSelect={() => toggle(c.id)}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------------- Mode panels ---------------- */

function TextPanel() {
  const captureText = useCaptureText()
  const [draft, setDraft] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || captureText.isPending) return
    captureText.mutate(text, { onSuccess: () => setDraft('') })
  }
  return (
    <form className="capture-panel" onSubmit={submit}>
      <textarea
        className="input capture-input"
        rows={3}
        placeholder="What's on your mind? Task, thought, idea — or a command"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="capture-panel-actions">
        <button className="btn primary" type="submit" disabled={!draft.trim() || captureText.isPending}>
          {captureText.isPending ? 'Capturing…' : 'Capture'}
        </button>
      </div>
    </form>
  )
}

function VoicePanel() {
  const captureVoice = useCaptureVoice()
  const [rec, setRec] = useState<Recorder | null>(null)
  const toggle = async () => {
    if (rec) {
      const wav = await rec.stop()
      setRec(null)
      captureVoice.mutate(wav)
    } else {
      try {
        setRec(await startRecording())
      } catch {
        alert('Could not access the microphone.')
      }
    }
  }
  return (
    <div className="capture-panel capture-record">
      <button
        type="button"
        className={`record-orb${rec ? ' recording' : ''}`}
        onClick={() => void toggle()}
        title={rec ? 'Stop & transcribe' : 'Record a voice memo'}
      >
        {rec ? <Square size={22} /> : <Mic size={22} />}
      </button>
      <p className="muted small">{rec ? 'Recording… tap to stop & transcribe' : 'Tap to record a voice memo'}</p>
    </div>
  )
}

function PhotoPanel() {
  const capturePhoto = useCapturePhoto()
  const fileRef = useRef<HTMLInputElement>(null)
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) capturePhoto.mutate(file)
    e.target.value = ''
  }
  return (
    <div className="capture-panel capture-record">
      <button
        type="button"
        className="record-orb"
        onClick={() => fileRef.current?.click()}
        disabled={capturePhoto.isPending}
        title="Whiteboard · book page · receipt · business card"
      >
        <Camera size={22} />
      </button>
      <p className="muted small">
        {capturePhoto.isPending ? 'Reading…' : 'Photo of a whiteboard, book page, receipt or card → OCR'}
      </p>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
    </div>
  )
}

function LinkPanel() {
  const captureLink = useCaptureLink()
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [areaId, setAreaId] = useState('')
  const [saved, setSaved] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!url.trim() || captureLink.isPending) return
    captureLink.mutate(
      { url: url.trim(), note: note.trim() || undefined, areaId: areaId || undefined },
      {
        onSuccess: () => {
          setUrl('')
          setNote('')
          setSaved(true)
          setTimeout(() => setSaved(false), 4000)
        },
      },
    )
  }
  return (
    <form className="capture-panel" onSubmit={submit}>
      <Field label="URL">
        <input
          className="input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          autoFocus
        />
      </Field>
      <Field label="Why it matters (optional)">
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="Area (optional)">
        <AreaSelect value={areaId} onChange={setAreaId} />
      </Field>
      <div className="capture-panel-actions">
        {saved && <span className="muted small">✓ Saved to Resources — fetching the page…</span>}
        {captureLink.isError && <span className="error small">{(captureLink.error as Error).message}</span>}
        <button className="btn primary" type="submit" disabled={!url.trim() || captureLink.isPending}>
          {captureLink.isPending ? 'Saving…' : 'Save to Resources'}
        </button>
      </div>
    </form>
  )
}

function CallPanel() {
  const captureCall = useCaptureCall()
  const [rec, setRec] = useState<Recorder | null>(null)
  const [transcript, setTranscript] = useState('')
  const [attendees, setAttendees] = useState('')

  const attendeeList = () =>
    attendees
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)

  const toggleRec = async () => {
    if (rec) {
      const wav = await rec.stop()
      setRec(null)
      captureCall.mutate({ audio: wav, attendees: attendeeList() }, { onSuccess: () => setAttendees('') })
    } else {
      try {
        setRec(await startRecording())
      } catch {
        alert('Could not access the microphone.')
      }
    }
  }

  const submitTranscript = (e: FormEvent) => {
    e.preventDefault()
    if (!transcript.trim() || captureCall.isPending) return
    captureCall.mutate(
      { transcript: transcript.trim(), attendees: attendeeList() },
      {
        onSuccess: () => {
          setTranscript('')
          setAttendees('')
        },
      },
    )
  }

  return (
    <form className="capture-panel" onSubmit={submitTranscript}>
      <Field label="Who was on the call? (optional, comma-separated)">
        <input
          className="input"
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          placeholder="Alex, Sam"
        />
      </Field>
      <div className="capture-record">
        <button
          type="button"
          className={`record-orb${rec ? ' recording' : ''}`}
          onClick={() => void toggleRec()}
          title={rec ? 'Stop & process' : 'Record the call'}
        >
          {rec ? <Square size={22} /> : <Phone size={22} />}
        </button>
        <p className="muted small">
          {rec ? 'Recording… tap to stop — Whisper transcribes, then it’s summarised' : 'Long-form: record the call'}
        </p>
      </div>
      <Field label="…or paste a transcript">
        <textarea
          className="input"
          rows={4}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste a meeting/call transcript to summarise + extract action items…"
        />
      </Field>
      <div className="capture-panel-actions">
        {captureCall.isError && <span className="error small">{(captureCall.error as Error).message}</span>}
        <button className="btn primary" type="submit" disabled={!transcript.trim() || captureCall.isPending}>
          {captureCall.isPending ? 'Processing…' : 'Summarise transcript'}
        </button>
      </div>
    </form>
  )
}

/* ---------------- Inbox card ---------------- */

function CaptureCard({
  capture,
  selected,
  onToggleSelect,
}: {
  capture: Capture
  selected: boolean
  onToggleSelect: () => void
}) {
  const dismiss = useDismissCapture()
  const del = useDeleteCapture()
  const busy = capture.status === 'pending' || capture.status === 'enriching'
  const isCommand = capture.suggestion?.entityType === 'command'
  const isCall = capture.kind === 'call'

  return (
    <div className={`card capture-card${selected ? ' selected' : ''}`}>
      <div className="capture-card-head">
        <input
          type="checkbox"
          className="capture-select"
          checked={selected}
          onChange={onToggleSelect}
          aria-label="Select capture"
        />
        <span className="capture-kind-badge muted small">{capture.kind}</span>
      </div>

      {capture.kind === 'photo' && capture.mediaPath && (
        <img className="capture-thumb" src={captureMediaUrl(capture.id)} alt="capture" />
      )}
      {(capture.kind === 'voice' || capture.kind === 'call') && capture.mediaPath && (
        <audio className="capture-audio" controls src={captureMediaUrl(capture.id)} />
      )}

      {!isCall && (
        <p className="capture-text">{capture.text || <span className="muted">{busy ? '' : '…'}</span>}</p>
      )}

      {busy && (
        <div className="capture-status">
          <Loader size={14} className="spin" /> {isCall ? 'Transcribing & summarising…' : 'Analyzing…'}
        </div>
      )}
      {capture.status === 'failed' && (
        <div className="capture-status capture-failed">Couldn’t analyze: {capture.error}</div>
      )}

      {capture.status === 'suggested' && isCall && <CallBody capture={capture} />}
      {capture.status === 'suggested' && !isCall && isCommand && <CommandBody capture={capture} />}
      {capture.status === 'suggested' && !isCall && !isCommand && capture.suggestion && (
        <SuggestionBody capture={capture} />
      )}

      {(capture.status === 'failed' || isCall || isCommand) && (
        <div className="capture-actions">
          <button className="btn ghost sm" onClick={() => dismiss.mutate(capture.id)}>
            <X size={14} /> Dismiss
          </button>
          <button className="btn ghost sm" onClick={() => del.mutate(capture.id)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

function CommandBody({ capture }: { capture: Capture }) {
  const navigate = useNavigate()
  const f = (capture.suggestion?.fields ?? {}) as Record<string, unknown>
  const instruction = sval(f, 'instruction') || capture.text
  return (
    <>
      <div className="suggestion">
        <span className="badge done suggestion-type">
          <Play size={12} strokeWidth={2.5} /> Command
        </span>
        <span className="suggestion-summary">{instruction}</span>
      </div>
      <p className="suggestion-why">An instruction to run — the chat agent will execute it (you approve each change).</p>
      <div className="capture-actions">
        <button
          className="btn primary sm"
          onClick={() => navigate('/chat', { state: { run: instruction } })}
        >
          <Play size={14} /> Run in chat
        </button>
      </div>
    </>
  )
}

function CallBody({ capture }: { capture: Capture }) {
  const saveNote = useSaveCallNote()
  const acceptItem = useAcceptCallItem()
  const dismissItem = useDismissCallItem()
  const call = capture.call
  if (!call) return null

  return (
    <div className="call-body">
      {call.attendees && call.attendees.length > 0 && (
        <p className="small">
          <span className="muted">With:</span> {call.attendees.join(', ')}
        </p>
      )}
      <p className="capture-text">{call.summary}</p>

      <div className="call-summary-actions">
        {call.noteId ? (
          <span className="muted small">✓ Summary saved as a note</span>
        ) : (
          <button className="btn ghost sm" disabled={saveNote.isPending} onClick={() => saveNote.mutate({ id: capture.id })}>
            <StickyNote size={13} /> Save summary as note
          </button>
        )}
      </div>

      {call.actionItems.length > 0 && (
        <div className="call-items">
          <span className="muted small">Action items</span>
          {call.actionItems.map((item, i) => (
            <CallItemRow
              key={i}
              item={item}
              onAccept={() => acceptItem.mutate({ id: capture.id, index: i })}
              onDismiss={() => dismissItem.mutate({ id: capture.id, index: i })}
              pending={acceptItem.isPending || dismissItem.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CallItemRow({
  item,
  onAccept,
  onDismiss,
  pending,
}: {
  item: CallActionItem
  onAccept: () => void
  onDismiss: () => void
  pending: boolean
}) {
  const Icon = item.entityType === 'reminder' ? Clock : CheckSquare
  const title = sval(item.fields, 'title') || '(untitled)'
  const when = sval(item.fields, 'remindAt') || sval(item.fields, 'dueDate')
  return (
    <div className={`call-item${item.status !== 'pending' ? ' resolved' : ''}`}>
      <Icon size={14} />
      <span className="call-item-title">{title}</span>
      {when && <span className="muted small mono">{when.slice(0, 16).replace('T', ' ')}</span>}
      {item.status === 'pending' ? (
        <span className="call-item-actions">
          <button className="btn ghost sm" disabled={pending} onClick={onAccept}>
            <Check size={13} /> Add
          </button>
          <button className="btn ghost sm" disabled={pending} onClick={onDismiss}>
            <X size={13} />
          </button>
        </span>
      ) : (
        <span className={`badge ${item.status === 'accepted' ? 'done' : 'muted'}`}>{item.status}</span>
      )}
    </div>
  )
}

function SuggestionBody({ capture }: { capture: Capture }) {
  const accept = useAcceptCapture()
  const dismiss = useDismissCapture()
  const [editing, setEditing] = useState(false)
  const s = capture.suggestion!
  const meta = TYPE_META[s.entityType]
  const f = (s.fields ?? {}) as Record<string, unknown>

  return (
    <>
      <div className="suggestion">
        <span className="badge done suggestion-type">
          {(() => {
            const Icon = meta?.icon ?? StickyNote
            return <Icon size={12} strokeWidth={2.5} />
          })()}
          {meta?.label ?? s.entityType}
        </span>
        <span className="suggestion-summary">
          {s.entityType === 'task'
            ? sval(f, 'title')
            : s.entityType === 'resource'
              ? sval(f, 'title') || sval(f, 'url') || sval(f, 'content')
              : sval(f, 'title') || sval(f, 'content')}
        </span>
        {s.entityType === 'task' && (
          <span className="suggestion-tags">
            {f.urgent ? <span className="badge bad">urgent</span> : null}
            {f.important ? <span className="badge warn">important</span> : null}
            {sval(f, 'dueDate') ? <span className="badge muted">due {sval(f, 'dueDate')}</span> : null}
          </span>
        )}
        {s.entityType === 'resource' && sval(f, 'kind') && (
          <span className="suggestion-tags">
            <span className="badge muted">{sval(f, 'kind')}</span>
          </span>
        )}
      </div>
      {s.rationale && <p className="suggestion-why">{s.rationale}</p>}

      <div className="capture-actions">
        <button className="btn primary sm" disabled={accept.isPending} onClick={() => accept.mutate({ id: capture.id })}>
          <Check size={14} /> Accept
        </button>
        <button className="btn ghost sm" onClick={() => setEditing(true)}>
          <Pencil size={14} /> Edit
        </button>
        <button className="btn ghost sm" onClick={() => dismiss.mutate(capture.id)}>
          <X size={14} /> Dismiss
        </button>
      </div>

      {editing && (
        <EditModal
          capture={capture}
          onClose={() => setEditing(false)}
          onSave={(body) => accept.mutate({ id: capture.id, body }, { onSuccess: () => setEditing(false) })}
        />
      )}
    </>
  )
}

function EditModal({
  capture,
  onClose,
  onSave,
}: {
  capture: Capture
  onClose: () => void
  onSave: (body: { entityType: EntityType; fields: Record<string, unknown> }) => void
}) {
  const s = capture.suggestion!
  const f0 = (s.fields ?? {}) as Record<string, unknown>
  const [entityType, setEntityType] = useState<EntityType>(
    (s.entityType === 'command' ? 'note' : s.entityType) as EntityType,
  )
  const [title, setTitle] = useState(sval(f0, 'title'))
  const [content, setContent] = useState(sval(f0, 'content') || capture.text)
  const [notes, setNotes] = useState(sval(f0, 'notes'))
  const [urgent, setUrgent] = useState(Boolean(f0.urgent))
  const [important, setImportant] = useState(Boolean(f0.important))
  const [dueDate, setDueDate] = useState(sval(f0, 'dueDate'))
  const [kind, setKind] = useState(sval(f0, 'kind') || (sval(f0, 'url') ? 'link' : 'prompt'))
  const [url, setUrl] = useState(sval(f0, 'url'))

  const save = (e: FormEvent) => {
    e.preventDefault()
    let fields: Record<string, unknown>
    if (entityType === 'task') {
      fields = { title, urgent, important, dueDate: dueDate || null, notes }
    } else if (entityType === 'resource') {
      fields = { kind, title, url: url.trim() || null, content: content.trim() || null }
    } else {
      fields = { title, content }
    }
    onSave({ entityType, fields })
  }

  return (
    <Modal title="Review & file" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <Field label="File as">
          <select className="input" value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)}>
            <option value="task">Task</option>
            <option value="note">Note</option>
            <option value="journal">Journal entry</option>
            <option value="resource">Resource</option>
          </select>
        </Field>

        {entityType === 'task' ? (
          <>
            <Field label="Title">
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </Field>
            <div className="row">
              <label className="check">
                <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /> Urgent
              </label>
              <label className="check">
                <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} /> Important
              </label>
            </div>
            <Field label="Due date">
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="Notes">
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </>
        ) : entityType === 'resource' ? (
          <>
            <Field label="Kind">
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                {RESOURCE_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </Field>
            <Field label="URL (optional)">
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Content (pasted text — e.g. a prompt/PRD)">
              <textarea className="input" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Title (optional)">
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Content">
              <textarea
                className="input"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
              />
            </Field>
          </>
        )}

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            File it
          </button>
        </div>
      </form>
    </Modal>
  )
}
