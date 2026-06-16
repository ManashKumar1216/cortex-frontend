import { Fragment, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BookOpen,
  BookmarkPlus,
  Check,
  CheckSquare,
  Database,
  FileText,
  Flame,
  FolderKanban,
  Globe,
  LayoutGrid,
  Loader,
  Mic,
  Paperclip,
  PenLine,
  Sparkles,
  Target,
  ThumbsUp,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'

import {
  resumeApproval,
  streamMessage,
  useAskCaptures,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useDraft,
  useLLMHealth,
  useMessageFeedback,
  useMessages,
  useSkills,
  type ChatAttachment,
  type StreamHandlers,
} from '../api/chat'
import { useMemoryStats, useReindexMemory, useSaveToMemory } from '../api/memory'
import { useDueReminders, useReminderActions } from '../api/reminders'
import { HeadsUpRail } from '../components/HeadsUpRail'
import { Markdown } from '../components/Markdown'
import { Modal } from '../components/Modal'
import { Field } from '../components/ui'
import { formatDateTime, useTimeFormat, type TimeFormat } from '../lib/time'
import type { ApprovalDecision, ApprovalRequest, ChatSource, Reminder, Skill, ToolStep } from '../lib/types'

const SOURCE_ICON: Record<string, LucideIcon> = {
  task: CheckSquare,
  project: FolderKanban,
  goal: Target,
  area: LayoutGrid,
  habit: Flame,
  journal: BookOpen,
}

function SourceChips({ sources }: { sources: ChatSource[] }) {
  const local = sources.filter((s) => s.sourceType !== 'web')
  if (!local.length) return null
  return (
    <div className="src-chips">
      <span className="src-chips-label">Grounded on</span>
      {local.map((s) => {
        const Icon = SOURCE_ICON[s.sourceType] ?? FileText
        return (
          <span
            key={`${s.sourceType}:${s.sourceId}`}
            className="src-chip"
            title={`${s.sourceType} · ${Math.round(s.score * 100)}% match${
              s.timestamp ? ` · ${new Date(s.timestamp).toLocaleString()}` : ''
            }`}
          >
            <Icon size={12} strokeWidth={2} />
            {s.title}
            {s.timestamp && (
              <span className="src-chip-time">{new Date(s.timestamp).toLocaleDateString()}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

function WebChips({ sources }: { sources: ChatSource[] }) {
  const web = sources.filter((s) => s.sourceType === 'web')
  if (!web.length) return null
  return (
    <div className="web-chips">
      <span className="src-chips-label">
        <Globe size={11} strokeWidth={2} /> Web · left this device
      </span>
      {web.map((s) => (
        <a key={s.sourceId} className="web-chip" href={s.url ?? s.sourceId} target="_blank" rel="noreferrer">
          {s.title || s.sourceId}
        </a>
      ))}
    </div>
  )
}

function ToolSteps({ steps }: { steps: ToolStep[] }) {
  if (!steps.length) return null
  return (
    <div className="tool-steps">
      {steps.map((s, i) => (
        <span key={`${s.tool}-${i}`} className={`tool-step${s.status === 'done' ? ' done' : ''}`}>
          {s.status === 'running' ? (
            <Loader size={12} className="spin" />
          ) : s.networked ? (
            <Globe size={12} />
          ) : (
            <Wrench size={12} />
          )}
          {s.tool.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  )
}

const FIELD_LABEL: Record<string, string> = {
  title: 'Title',
  name: 'Name',
  notes: 'Notes',
  content: 'Content',
  dueDate: 'Due date',
  remindAt: 'Remind at',
  urgent: 'Urgent',
  important: 'Important',
  status: 'Status',
  weight: 'Weight',
}
const label = (k: string) => FIELD_LABEL[k] ?? k

/** ISO 8601 with a time component (so date-only strings like "2026-06-14" are left alone). */
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
/** Render field values, showing ISO timestamps in the owner's local timezone. */
function fieldValue(v: unknown, fmt: TimeFormat): string {
  if (typeof v === 'string' && ISO_DATETIME.test(v)) {
    const formatted = formatDateTime(v, fmt, { withYear: true })
    if (formatted) return formatted
  }
  return String(v)
}

/** Edit the proposed args before approving. Returns only the changed fields. */
function ApprovalEditModal({
  req,
  onClose,
  onSubmit,
}: {
  req: ApprovalRequest
  onClose: () => void
  onSubmit: (fields: Record<string, unknown>) => void
}) {
  const initial: Record<string, unknown> = {}
  if (req.preview.type === 'create') {
    for (const f of req.preview.fields) initial[f.key] = f.value
  } else if (
    req.preview.type === 'update' ||
    req.preview.type === 'complete' ||
    req.preview.type === 'cancel'
  ) {
    for (const c of req.preview.changes) initial[c.key] = c.after
  } else if (req.preview.type === 'send') {
    initial.to = req.preview.to
    initial.subject = req.preview.subject
    initial.body = req.preview.body
  }
  const [values, setValues] = useState<Record<string, unknown>>(initial)
  const set = (k: string, v: unknown) => setValues((prev) => ({ ...prev, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <Modal title={`Edit — ${req.summary}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {Object.entries(values).map(([k, v]) =>
          typeof v === 'boolean' ? (
            <label key={k} className="row" style={{ gap: 8 }}>
              <input type="checkbox" checked={v} onChange={(e) => set(k, e.target.checked)} />
              {label(k)}
            </label>
          ) : (
            <Field key={k} label={label(k)}>
              <input
                className="input"
                value={v === null || v === undefined ? '' : String(v)}
                onChange={(e) =>
                  set(k, typeof v === 'number' ? Number(e.target.value) : e.target.value)
                }
              />
            </Field>
          ),
        )}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Approve with edits
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ApprovalCard({
  req,
  busy,
  onApprove,
  onEdit,
  onCancel,
}: {
  req: ApprovalRequest
  busy: boolean
  onApprove: () => void
  onEdit: () => void
  onCancel: () => void
}) {
  const p = req.preview
  const destructive = p.type === 'delete'
  const timeFmt = useTimeFormat()
  return (
    <div className={`card approval-card${destructive ? ' approval-destructive' : ''}`}>
      <div className="suggestion-summary">{req.summary}</div>
      {p.type === 'create' && (
        <ul className="approval-diff">
          {p.fields.map((f) => (
            <li key={f.key}>
              <span className="muted">{label(f.key)}</span> <span className="mono">{fieldValue(f.value, timeFmt)}</span>
            </li>
          ))}
        </ul>
      )}
      {(p.type === 'update' || p.type === 'complete' || p.type === 'cancel') && (
        <ul className="approval-diff">
          <li className="muted small">on “{p.targetTitle}”</li>
          {p.changes.map((c) => (
            <li key={c.key}>
              <span className="muted">{label(c.key)}</span>{' '}
              <span className="mono struck">{c.before == null ? '∅' : fieldValue(c.before, timeFmt)}</span> →{' '}
              <span className="mono">{fieldValue(c.after, timeFmt)}</span>
            </li>
          ))}
        </ul>
      )}
      {(p.type === 'log' || p.type === 'unlog') && (
        <p className="suggestion-why">
          {p.type === 'log' ? 'Log' : 'Unlog'} “{p.targetTitle}” on {p.date}
        </p>
      )}
      {p.type === 'delete' && <p className="suggestion-why">{p.warning} — “{p.targetTitle}”</p>}
      {p.type === 'send' && (
        <div className="approval-email">
          <div className="approval-email-row">
            <span className="muted">To</span> <span className="mono">{p.to}</span>
          </div>
          <div className="approval-email-row">
            <span className="muted">Subject</span> <span>{p.subject}</span>
          </div>
          <div className="approval-email-body">{p.body}</div>
        </div>
      )}
      {p.type === 'failed' && <p className="suggestion-why error">{p.reason}</p>}

      {p.type !== 'failed' && (
        <div className="capture-actions">
          <button className="btn primary" onClick={onApprove} disabled={busy}>
            Approve
          </button>
          {!destructive && p.type !== 'log' && p.type !== 'unlog' && (
            <button className="btn" onClick={onEdit} disabled={busy}>
              Edit
            </button>
          )}
          <button className="btn ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      )}
      {p.type === 'failed' && (
        <div className="capture-actions">
          <button className="btn ghost" onClick={onCancel} disabled={busy}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

function DueDigest({
  reminders,
  onComplete,
  onSnooze,
  onPlan,
}: {
  reminders: Reminder[]
  onComplete: (id: string) => void
  onSnooze: (id: string) => void
  onPlan: () => void
}) {
  const timeFmt = useTimeFormat()
  if (!reminders.length) return null
  return (
    <div className="reminder-digest">
      <div className="row-between">
        <strong className="row" style={{ gap: 6 }}>
          <Bell size={14} /> {reminders.length} reminder{reminders.length > 1 ? 's' : ''} due
        </strong>
        <button className="btn sm" onClick={onPlan}>
          Plan with Cortex
        </button>
      </div>
      <div className="list">
        {reminders.map((r) => (
          <div key={r.id} className="reminder-row">
            <span className="reminder-when mono">
              {formatDateTime(r.remindAt, timeFmt)}
            </span>
            <span className="reminder-title">{r.title}</span>
            <button className="btn ghost sm" onClick={() => onComplete(r.id)}>
              Done
            </button>
            <button className="btn ghost sm" onClick={() => onSnooze(r.id)}>
              Snooze 1h
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChatPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const health = useLLMHealth()
  const conversations = useConversations()
  const createConversation = useCreateConversation()
  const deleteConversation = useDeleteConversation()
  const memoryStats = useMemoryStats()
  const reindex = useReindexMemory()
  const saveToMemory = useSaveToMemory()
  const messageFeedback = useMessageFeedback()
  const draftMut = useDraft()
  const [draftMode, setDraftMode] = useState(false)
  const captureMut = useAskCaptures()
  const [captureMode, setCaptureMode] = useState(false)
  const skills = useSkills()
  const dueReminders = useDueReminders()
  const reminderActions = useReminderActions()
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [exampleIds, setExampleIds] = useState<Set<string>>(new Set())

  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const messages = useMessages(activeId)

  const [draft, setDraft] = useState('')
  const [pendingUser, setPendingUser] = useState<string | null>(null)
  const [streamText, setStreamText] = useState('')
  const [streamSources, setStreamSources] = useState<ChatSource[]>([])
  const [steps, setSteps] = useState<ToolStep[]>([])
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null)
  const [editing, setEditing] = useState<ApprovalRequest | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const turnConvId = useRef<string | undefined>(undefined)
  const didWrite = useRef(false)

  const threadRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages.data, streamText, pendingUser, steps, pendingApproval])

  const finalizeTurn = () => {
    if (didWrite.current) {
      void qc.invalidateQueries()
    } else {
      void qc.invalidateQueries({ queryKey: ['chat', 'messages', turnConvId.current] })
      void qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    }
    setPendingUser(null)
    setStreamText('')
    setStreamSources([])
    setSteps([])
    setPendingApproval(null)
    setBusy(false)
    didWrite.current = false
  }

  const handlers = (): StreamHandlers => ({
    onDelta: (delta) => setStreamText((prev) => prev + delta),
    onSources: (sources) => setStreamSources(sources),
    onStep: (step) =>
      setSteps((prev) => {
        if (step.status === 'running') return [...prev, step]
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].tool === step.tool && prev[i].status === 'running') {
            const next = prev.slice()
            next[i] = { ...next[i], status: 'done' }
            return next
          }
        }
        return [...prev, step]
      }),
    onApproval: (req) => {
      setPendingApproval(req)
      setBusy(false)
    },
    onResolved: (r) => {
      if (r.status === 'approved') didWrite.current = true
    },
    onDone: ({ awaitingApproval }) => {
      if (awaitingApproval) setBusy(false)
      else finalizeTurn()
    },
  })

  const startTurn = async (text: string, skillSlug?: string, att?: ChatAttachment | null) => {
    if (busy || pendingApproval) return
    let conversationId = activeId
    if (!conversationId) {
      const conv = await createConversation.mutateAsync()
      conversationId = conv.id
      setActiveId(conv.id)
    }
    turnConvId.current = conversationId
    didWrite.current = false

    setDraft('')
    setAttachment(null)
    setPendingUser(att ? `${text}  📎 ${att.name ?? att.kind}` : text)
    setStreamText('')
    setStreamSources([])
    setSteps([])
    setPendingApproval(null)
    setBusy(true)
    setError(null)
    try {
      await streamMessage(conversationId, text, handlers(), skillSlug, att ?? undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed')
      finalizeTurn()
    }
  }

  const runDraft = async (topic: string) => {
    if (busy) return
    setDraft('')
    setPendingUser(`✍️ Draft: ${topic}`)
    setBusy(true)
    setError(null)
    try {
      const r = await draftMut.mutateAsync({ conversationId: activeId, topic })
      if (!activeId) setActiveId(r.conversationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft failed')
    } finally {
      setPendingUser(null)
      setBusy(false)
    }
  }

  const runCaptures = async (question: string) => {
    if (busy) return
    setDraft('')
    setPendingUser(`🎙️ Captures: ${question}`)
    setBusy(true)
    setError(null)
    try {
      const r = await captureMut.mutateAsync({ conversationId: activeId, question })
      if (!activeId) setActiveId(r.conversationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Captures search failed')
    } finally {
      setPendingUser(null)
      setBusy(false)
    }
  }

  const send = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (captureMode) {
      if (text) void runCaptures(text)
      return
    }
    if (draftMode) {
      if (text) void runDraft(text)
      return
    }
    // Allow sending an attachment with no text (default to a "what's in this?" prompt).
    if (!text && !attachment) return
    void startTurn(text || (attachment ? "What's in this?" : ''), undefined, attachment)
  }

  const onPickFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImg = file.type.startsWith('image/')
    if (!isPdf && !isImg) {
      setError('Only images and PDFs can be attached.')
      return
    }
    if (file.size > 18 * 1024 * 1024) {
      setError('Attachment is too large (max ~18MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const base64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result
      setAttachment({ kind: isPdf ? 'pdf' : 'image', data: base64, name: file.name })
    }
    reader.readAsDataURL(file)
  }

  // Command-mode handoff from Capture: navigate('/chat', { state: { run } }) →
  // run the instruction once through the agent (with its confirm-before-write card).
  const ranHandoff = useRef(false)
  useEffect(() => {
    const run = (location.state as { run?: string } | null)?.run
    if (run && !ranHandoff.current && !busy) {
      ranHandoff.current = true
      navigate('/chat', { replace: true, state: null }) // clear so a refresh won't re-run it
      void startTurn(run)
    }
  }, [location.state, busy, navigate, startTurn])

  const runSkill = (skill: Skill) => void startTurn(skill.title, skill.slug)

  const resolve = async (decision: ApprovalDecision, fields?: Record<string, unknown>) => {
    const req = pendingApproval
    const convId = turnConvId.current
    if (!req || !convId) return
    setPendingApproval(null)
    setEditing(null)
    setBusy(true)
    setError(null)
    try {
      await resumeApproval(convId, req.messageId, { toolCallId: req.toolCallId, decision, fields }, handlers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve the action')
      finalizeTurn()
    }
  }

  const startNewChat = () => {
    setActiveId(undefined)
    setError(null)
  }

  const llmDown = health.data && (!health.data.ok || !health.data.modelPresent)
  const webOn = health.data?.webSearch?.enabled
  // A freshly-created conversation re-fetches and already includes the just-sent
  // user message; don't also render the optimistic pendingUser bubble in that case.
  const dupUser =
    !!pendingUser && (messages.data?.some((m) => m.role === 'user' && m.content === pendingUser) ?? false)

  return (
    <div className="chat-layout">
      <div className="chat-convos">
        <button className="btn primary full" onClick={startNewChat}>
          + New chat
        </button>
        <div className="convo-list">
          {conversations.data?.map((conv) => (
            <div
              key={conv.id}
              className={`convo-item${conv.id === activeId ? ' active' : ''}`}
              onClick={() => setActiveId(conv.id)}
            >
              <span className="convo-title">{conv.title}</span>
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Delete conversation?')) {
                    deleteConversation.mutate(conv.id)
                    if (conv.id === activeId) setActiveId(undefined)
                  }
                }}
                aria-label="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="memory-bar">
          <span className="memory-stat">
            <Database size={13} strokeWidth={2} />
            {memoryStats.data?.total ?? 0} memories
          </span>
          <button
            className="btn ghost sm"
            onClick={() => reindex.mutate(false)}
            disabled={reindex.isPending}
            title="Re-embed your tasks, projects, goals, habits and journal"
          >
            {reindex.isPending ? 'Indexing…' : 'Reindex'}
          </button>
        </div>
      </div>

      <div className="chat-main">
        {llmDown && (
          <div className="chat-banner">
            {!health.data?.ok
              ? `Local model unreachable — is Ollama running at the configured URL?`
              : `Model "${health.data?.model}" isn't pulled. Run: ollama pull ${health.data?.model}`}
          </div>
        )}
        {webOn && (
          <div className="egress-note">
            <Globe size={12} /> Web search on · {health.data?.webSearch?.provider} · queries leave this
            device
          </div>
        )}

        <div className="chat-messages" ref={threadRef}>
          {dueReminders.data && dueReminders.data.length > 0 && (
            <DueDigest
              reminders={dueReminders.data}
              onComplete={(id) => reminderActions.complete.mutate(id)}
              onSnooze={(id) => reminderActions.snooze.mutate({ id, minutes: 60 })}
              onPlan={() => void startTurn('Plan my day', 'plan-my-day')}
            />
          )}
          {!activeId && !pendingUser && (
            <div className="chat-empty">
              <h2>Chat with Cortex</h2>
              <p className="muted">Your local model: {health.data?.model ?? '…'}</p>
            </div>
          )}
          {messages.data?.map((m) => (
            <Fragment key={m.id}>
              <div className={`msg ${m.role}`}>
                {m.role === 'assistant' ? <Markdown source={m.content} /> : m.content}
              </div>
              {m.role === 'assistant' && m.sources?.length ? (
                <>
                  <SourceChips sources={m.sources} />
                  <WebChips sources={m.sources} />
                </>
              ) : null}
              {m.role === 'assistant' && !m.content.startsWith('⏳') && (
                <div className="msg-tools">
                  <button
                    className="msg-tool"
                    disabled={savedIds.has(m.id) || saveToMemory.isPending}
                    onClick={() =>
                      saveToMemory.mutate(m.content, {
                        onSuccess: () => setSavedIds((prev) => new Set(prev).add(m.id)),
                      })
                    }
                  >
                    {savedIds.has(m.id) ? (
                      <>
                        <Check size={12} strokeWidth={2.5} /> Saved
                      </>
                    ) : (
                      <>
                        <BookmarkPlus size={12} /> Save to memory
                      </>
                    )}
                  </button>
                  <button
                    className="msg-tool"
                    disabled={exampleIds.has(m.id) || messageFeedback.isPending}
                    title="Mark this as a good answer — Cortex will match its style next time"
                    onClick={() =>
                      messageFeedback.mutate(
                        { id: m.id, rating: 'up', saveExample: true },
                        { onSuccess: () => setExampleIds((prev) => new Set(prev).add(m.id)) },
                      )
                    }
                  >
                    {exampleIds.has(m.id) ? (
                      <>
                        <Check size={12} strokeWidth={2.5} /> Example saved
                      </>
                    ) : (
                      <>
                        <ThumbsUp size={12} /> Good answer
                      </>
                    )}
                  </button>
                </div>
              )}
            </Fragment>
          ))}

          {pendingUser && !dupUser && <div className="msg user">{pendingUser}</div>}
          {(pendingUser || busy) && (
            <>
              <ToolSteps steps={steps} />
              {(streamText || (busy && !pendingApproval)) && (
                <div className="msg assistant">
                  {streamText ? <Markdown source={streamText} /> : <span className="typing">▍</span>}
                </div>
              )}
              {streamSources.length > 0 && (
                <>
                  <SourceChips sources={streamSources} />
                  <WebChips sources={streamSources} />
                </>
              )}
              {pendingApproval && (
                <ApprovalCard
                  req={pendingApproval}
                  busy={busy}
                  onApprove={() => void resolve('approve')}
                  onEdit={() => setEditing(pendingApproval)}
                  onCancel={() => void resolve('cancel')}
                />
              )}
            </>
          )}
          {error && <div className="msg error-msg">{error}</div>}
        </div>

        {skills.data && skills.data.length > 0 && (
          <div className="skills-row">
            <Sparkles size={13} />
            {skills.data.map((s) => (
              <button
                key={s.slug}
                className="skill-chip"
                title={s.description}
                disabled={busy || !!pendingApproval}
                onClick={() => runSkill(s)}
              >
                {s.title}
              </button>
            ))}
          </div>
        )}

        {attachment && (
          <div className="chat-attachment-chip">
            <Paperclip size={13} />
            <span className="chat-attachment-name">{attachment.name ?? attachment.kind}</span>
            <span className="muted small">({attachment.kind})</span>
            <button type="button" className="icon-btn" title="Remove attachment" onClick={() => setAttachment(null)}>
              <X size={13} />
            </button>
          </div>
        )}
        {!pendingApproval && <HeadsUpRail text={draft} />}
        <form className="chat-input" onSubmit={send}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={onPickFile}
          />
          <button
            type="button"
            className="icon-btn chat-attach-btn"
            title="Attach an image or PDF"
            disabled={busy || !!pendingApproval}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={16} />
          </button>
          {health.data?.draftEnabled && (
            <button
              type="button"
              className={`icon-btn chat-attach-btn${draftMode ? ' active' : ''}`}
              title="Draft mode — write only from your own notes, with citations"
              disabled={busy || !!pendingApproval}
              onClick={() => {
                setDraftMode((v) => !v)
                setCaptureMode(false)
              }}
            >
              <PenLine size={16} />
            </button>
          )}
          {health.data?.crossCaptureEnabled && (
            <button
              type="button"
              className={`icon-btn chat-attach-btn${captureMode ? ' active' : ''}`}
              title="Ask your captures — answer only from ambient, email & chat captures, with timestamped citations"
              disabled={busy || !!pendingApproval}
              onClick={() => {
                setCaptureMode((v) => !v)
                setDraftMode(false)
              }}
            >
              <Mic size={16} />
            </button>
          )}
          <input
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              pendingApproval
                ? 'Approve, edit, or cancel the change above…'
                : captureMode
                  ? 'Ask your captures (ambient, email, chat)…'
                  : draftMode
                    ? 'Describe what to draft from your notes…'
                    : 'Message Cortex…'
            }
            disabled={busy || !!pendingApproval}
            autoFocus
          />
          <button
            className="btn primary"
            type="submit"
            disabled={
              busy ||
              !!pendingApproval ||
              (draftMode || captureMode ? !draft.trim() : !draft.trim() && !attachment)
            }
          >
            {busy ? '…' : captureMode ? 'Ask' : draftMode ? 'Draft' : 'Send'}
          </button>
        </form>
      </div>

      {editing && (
        <ApprovalEditModal
          req={editing}
          onClose={() => setEditing(null)}
          onSubmit={(fields) => void resolve('edit', fields)}
        />
      )}
    </div>
  )
}
