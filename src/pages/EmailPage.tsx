import { useEffect, useState, type FormEvent } from 'react'

import { Archive, ArrowLeft, ListPlus, Pencil, Plus, RefreshCw, Reply, RotateCcw, Search, Send, Trash2 } from 'lucide-react'

import {
  useEmailAccountActions,
  useEmailAccounts,
  useEmailMessageActions,
  useEmailMessages,
  useEmailStatus,
  useEmailThread,
  useEmailThreads,
  usePollEmail,
  useReprocessEmail,
} from '../api/email'
import { ActionItemForm } from '../components/ActionItemForm'
import { Modal } from '../components/Modal'
import { EmptyState, Field, PageHeader } from '../components/ui'
import { formatDate } from '../lib/format'
import type { EmailAccount, EmailDraft, EmailMessage, EmailThread, EmailThreadMessage } from '../lib/types'

export function EmailPage() {
  const status = useEmailStatus()
  const accounts = useEmailAccounts()
  const poll = usePollEmail()
  const reprocess = useReprocessEmail()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<EmailAccount | null>(null)
  const [reproBusy, setReproBusy] = useState(false)
  const [reproStatus, setReproStatus] = useState<string | null>(null)

  // The endpoint repairs a bounded batch per call (sequential, so it never floods
  // the local model). Drain it across calls on a single click, showing progress.
  async function runReprocess() {
    setReproBusy(true)
    setReproStatus(null)
    let total = 0
    try {
      for (let i = 0; i < 50; i++) {
        const r = await reprocess.mutateAsync()
        if (r.llmOffline) {
          setReproStatus('Local model is offline — start it, then Reprocess.')
          return
        }
        total += r.reprocessed
        if (r.remaining > 0) {
          setReproStatus(`Reprocessing… ${total} done, ${r.remaining} left`)
        } else {
          setReproStatus(total ? `Reprocessed ${total} message(s).` : 'All mail is up to date.')
          return
        }
      }
    } finally {
      setReproBusy(false)
    }
  }

  if (status.isPending) return <p className="muted">Loading…</p>
  if (!status.data?.credKeySet) {
    return (
      <div>
        <PageHeader title="Email" subtitle="Connect a mailbox to triage, reply, and get reminders by email" />
        <EmptyState
          message="Email is locked until you set an encryption key."
          hint="Add EMAIL_CRED_KEY to backend/.env.local (32-byte base64), then restart. It encrypts your mailbox passwords at rest."
        />
      </div>
    )
  }

  const hasAccounts = (accounts.data?.length ?? 0) > 0

  return (
    <div>
      <PageHeader
        title="Email"
        subtitle="Triaged inbox · replies need your approval before sending"
        action={
          <div className="pulse-actions">
            {hasAccounts && (
              <button className="btn ghost sm" onClick={() => poll.mutate()} disabled={poll.isPending}>
                <RefreshCw size={14} /> {poll.isPending ? 'Fetching…' : 'Poll now'}
              </button>
            )}
            {hasAccounts && (
              <button
                className="btn ghost sm"
                onClick={runReprocess}
                disabled={reproBusy}
                title="Re-triage and index mail that was fetched while the local model was offline"
              >
                <RotateCcw size={14} /> {reproBusy ? 'Reprocessing…' : 'Reprocess'}
              </button>
            )}
            <button className="btn primary sm" onClick={() => setAdding(true)}>
              <Plus size={14} /> Add mailbox
            </button>
          </div>
        }
      />

      <AccountsStrip accounts={accounts.data ?? []} onEdit={setEditing} />

      {poll.data && <p className="muted">Fetched {poll.data.handled} new message(s).</p>}
      {reproStatus && <p className="muted">{reproStatus}</p>}

      {hasAccounts ? (
        <Inbox />
      ) : (
        <EmptyState message="No mailbox yet. Add one to start triaging your inbox." />
      )}

      {(adding || editing) && (
        <AccountModal
          account={editing}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function AccountsStrip({ accounts, onEdit }: { accounts: EmailAccount[]; onEdit: (a: EmailAccount) => void }) {
  const { remove, test } = useEmailAccountActions()
  const [result, setResult] = useState<Record<string, string>>({})

  if (!accounts.length) return null
  return (
    <div className="email-accounts">
      {accounts.map((a) => (
        <div key={a.id} className="email-account">
          <div>
            <strong>{a.label}</strong> <span className="mono muted">{a.email}</span>
            {a.authState === 'auth_failed' && (
              <span className="badge bad email-health" title={a.lastError ?? 'Credentials rejected'}>
                Auth failed — update password
              </span>
            )}
            {a.authState === 'error' && (
              <span className="badge warn email-health" title={a.lastError ?? 'Connection error'}>
                Connection issue
              </span>
            )}
            {result[a.id] && <span className="email-test-result"> · {result[a.id]}</span>}
          </div>
          <div className="pulse-actions">
            <button
              className="btn ghost sm"
              disabled={test.isPending}
              onClick={() =>
                test.mutate(a.id, {
                  onSuccess: (r) =>
                    setResult((m) => ({
                      ...m,
                      [a.id]: r.imap && r.smtp ? 'IMAP ✓ SMTP ✓' : (r.error ?? 'failed'),
                    })),
                })
              }
            >
              {a.authState === 'auth_failed' ? 'Reconnect' : 'Test'}
            </button>
            <button className="btn ghost sm" onClick={() => onEdit(a)}>
              <Pencil size={14} /> Edit
            </button>
            <button
              className="icon-btn"
              aria-label="Remove"
              onClick={() => {
                if (confirm(`Remove mailbox "${a.label}"?`)) remove.mutate(a.id)
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const CATEGORIES = [
  { key: 'action', label: 'Needs action' },
  { key: 'fyi', label: 'FYI' },
] as const

type InboxView = 'action' | 'fyi' | 'threads'

function Inbox() {
  const [view, setView] = useState<InboxView>('action')
  return (
    <section className="email-inbox">
      <div className="filter-row">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`chip${view === c.key ? ' active' : ''}`}
            onClick={() => setView(c.key)}
          >
            {c.label}
          </button>
        ))}
        <button
          className={`chip${view === 'threads' ? ' active' : ''}`}
          onClick={() => setView('threads')}
        >
          Conversations
        </button>
      </div>
      {view === 'threads' ? <ConversationsView /> : <TriagedList category={view} />}
    </section>
  )
}

/** The original triaged inbox — a flat list of messages for one category (Needs action / FYI). */
function TriagedList({ category }: { category: 'action' | 'fyi' }) {
  const { data, isPending } = useEmailMessages(category)
  const [replyTo, setReplyTo] = useState<EmailMessage | null>(null)
  return (
    <>
      {isPending && <p className="muted">Loading…</p>}
      {data && data.length === 0 && <EmptyState message="Nothing here. Poll to fetch new mail." />}
      <div className="list">
        {data?.map((m) => (
          <MessageCard key={m.id} message={m} onReply={() => setReplyTo(m)} />
        ))}
      </div>
      {replyTo && <ReplyModal message={replyTo} onClose={() => setReplyTo(null)} />}
    </>
  )
}

function MessageCard({ message, onReply }: { message: EmailMessage; onReply: () => void }) {
  const { archive, convert } = useEmailMessageActions()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  return (
    <div className="card email-message">
      <div className="email-message-head">
        <span className="email-from">{message.from || 'unknown sender'}</span>
        <span className="mono muted">{formatDate(message.date)}</span>
      </div>
      <strong>{message.subject || '(no subject)'}</strong>
      <p className="note-content">{message.snippet}</p>
      <div className="email-message-foot">
        {message.triage?.reason && <span className="badge muted">{message.triage.reason}</span>}
        <div className="pulse-actions">
          {added ? (
            <span className="badge ok">Added as {added}</span>
          ) : (
            <button className="btn ghost sm" onClick={() => setAdding((v) => !v)}>
              <ListPlus size={14} /> Add to plan
            </button>
          )}
          <button className="btn ghost sm" onClick={onReply}>
            <Reply size={14} /> Reply
          </button>
          <button className="icon-btn" aria-label="Archive" onClick={() => archive.mutate(message.id)}>
            <Archive size={15} />
          </button>
        </div>
      </div>
      {adding && !added && (
        <ActionItemForm
          initial={{
            type: 'task',
            title: message.subject || '(no subject)',
            notes: `From email — ${message.from || 'unknown sender'}.`,
          }}
          busy={convert.isPending}
          submitLabel="Add"
          onCancel={() => setAdding(false)}
          onSubmit={(item) =>
            convert.mutate(
              { id: message.id, item },
              {
                onSuccess: (r) => {
                  setAdded(r.created.type)
                  setAdding(false)
                },
              },
            )
          }
        />
      )}
    </div>
  )
}

/** The threaded two-pane reader — every conversation (all categories), searchable. */
function ConversationsView() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const { data, isPending } = useEmailThreads(undefined, debouncedQ)
  const [selected, setSelected] = useState<EmailThread | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className={`thread-pane email-pane${selected ? ' has-selection' : ''}`}>
      <div className="thread-list">
        <div className="thread-search">
          <Search size={14} />
          <input
            className="thread-search-input"
            placeholder="Search mail…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="list thread-list-scroll">
          {isPending && <p className="muted">Loading…</p>}
          {data && data.length === 0 && <p className="muted small thread-empty">No conversations yet.</p>}
          {data?.map((t) => (
            <button
              key={t.threadKey}
              className={`email-thread-row${t.threadKey === selected?.threadKey ? ' active' : ''}`}
              onClick={() => setSelected(t)}
            >
              <span className="email-thread-row-top">
                <strong className="email-thread-subject">{t.subject || '(no subject)'}</strong>
                <span className="mono muted">{formatDate(t.lastDate)}</span>
              </span>
              <span className="muted small email-thread-people">{t.participants.join(', ') || 'unknown'}</span>
              <span className="muted small email-thread-snippet">{t.snippet}</span>
              <span className="email-thread-meta">
                {t.hasAction && <span className="badge warn">action</span>}
                {t.messageCount > 1 && <span className="badge muted">{t.messageCount} msgs</span>}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="thread-detail">
        {selected ? (
          <EmailThreadPane thread={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="thread-detail-empty">
            <EmptyState message="Select a conversation" hint="Pick a thread on the left to read the full messages." />
          </div>
        )}
      </div>
    </div>
  )
}

/** The selected conversation: each message with its full body, plus Reply/Archive. */
function EmailThreadPane({ thread, onBack }: { thread: EmailThread; onBack: () => void }) {
  const { data, isPending } = useEmailThread(thread.threadKey)
  const { archive } = useEmailMessageActions()
  const [replyTo, setReplyTo] = useState<EmailThreadMessage | null>(null)

  return (
    <div className="email-convo">
      <header className="email-convo-head">
        <button className="icon-btn wa-back" aria-label="Back to inbox" onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
        <div className="email-convo-title">
          <strong>{thread.subject || '(no subject)'}</strong>
          <span className="muted small">{thread.participants.join(', ')}</span>
        </div>
      </header>

      <div className="email-convo-body">
        {isPending ? (
          <p className="muted">Loading…</p>
        ) : (data ?? []).length === 0 ? (
          <EmptyState message="This conversation is empty." />
        ) : (
          data?.map((m) => (
            <article key={m.id} className="email-msg">
              <div className="email-msg-head">
                <span className="email-from">{m.from || 'unknown sender'}</span>
                <span className="mono muted">{formatDate(m.date)}</span>
              </div>
              {m.to && <div className="muted small email-msg-to">to {m.to}</div>}
              <div className="email-msg-body">{m.bodyText || m.snippet || '(no content)'}</div>
              <div className="email-message-foot">
                {m.triage?.reason && <span className="badge muted">{m.triage.reason}</span>}
                <div className="pulse-actions">
                  <button className="btn ghost sm" onClick={() => setReplyTo(m)}>
                    <Reply size={14} /> Reply
                  </button>
                  <button className="icon-btn" aria-label="Archive" onClick={() => archive.mutate(m.id)}>
                    <Archive size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {replyTo && <ReplyModal message={replyTo} onClose={() => setReplyTo(null)} />}
    </div>
  )
}

function ReplyModal({ message, onClose }: { message: EmailMessage; onClose: () => void }) {
  const { draftReply, send } = useEmailMessageActions()
  const [draft, setDraft] = useState<EmailDraft>({
    to: message.from ?? '',
    subject: (message.subject ?? '').toLowerCase().startsWith('re:')
      ? (message.subject ?? '')
      : `Re: ${message.subject ?? ''}`,
    body: '',
    inReplyTo: message.messageId,
  })
  const [sent, setSent] = useState(false)

  // Auto-draft once on open.
  useEffect(() => {
    draftReply.mutate(message.id, {
      onSuccess: (d) => setDraft((prev) => ({ ...prev, ...d })),
    })
  }, [message.id])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.to.trim() || !draft.body.trim()) return
    send.mutate(
      { id: message.id, draft },
      { onSuccess: () => { setSent(true); setTimeout(onClose, 800) } },
    )
  }

  return (
    <Modal title="Reply — review before sending" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="To">
          <input className="input" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        </Field>
        <Field label="Subject">
          <input
            className="input"
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          />
        </Field>
        <Field label={draftReply.isPending ? 'Drafting with Cortex…' : 'Message'}>
          <textarea
            className="input"
            rows={8}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder={draftReply.isPending ? '' : 'Write your reply…'}
          />
        </Field>
        {send.isError && <p className="error">{(send.error as Error).message}</p>}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={send.isPending || sent}>
            <Send size={14} /> {sent ? 'Sent' : send.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function endpointDefaults(kind: 'imap' | 'smtp') {
  return { host: '', port: kind === 'imap' ? 993 : 465, secure: true, user: '', password: '' }
}

/** Build the editable endpoint state from a saved account (password always starts blank). */
function endpointFrom(e: EmailAccount['imap'] | undefined, kind: 'imap' | 'smtp'): Endpoint {
  if (!e) return endpointDefaults(kind)
  return { host: e.host, port: e.port, secure: e.secure, user: e.user, password: '' }
}

function AccountModal({ account, onClose }: { account: EmailAccount | null; onClose: () => void }) {
  const { create, update } = useEmailAccountActions()
  const editing = !!account
  const [label, setLabel] = useState(account?.label ?? '')
  const [email, setEmail] = useState(account?.email ?? '')
  const [fromName, setFromName] = useState(account?.fromName ?? '')
  const [imap, setImap] = useState(() => endpointFrom(account?.imap, 'imap'))
  const [smtp, setSmtp] = useState(() => endpointFrom(account?.smtp, 'smtp'))

  // When creating, a password is required; when editing, blank means "keep the stored one".
  const endpointFor = (ep: Endpoint) => (editing && !ep.password ? { ...ep, password: undefined } : ep)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !email.trim() || !imap.host || !imap.user || !smtp.host || !smtp.user) return
    if (!editing && (!imap.password || !smtp.password)) return // password required on create
    const body = {
      label: label.trim(),
      email: email.trim(),
      fromName: fromName || undefined,
      imap: endpointFor(imap),
      smtp: endpointFor(smtp),
    }
    const done = { onSuccess: onClose }
    if (account) update.mutate({ id: account.id, body }, done)
    else create.mutate(body, done)
  }

  const pending = create.isPending || update.isPending
  const err = (create.error ?? update.error) as Error | null

  return (
    <Modal title={editing ? 'Edit mailbox' : 'Add a mailbox'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Label">
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Personal Gmail" autoFocus />
        </Field>
        <Field label="Email address">
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="From name (optional)">
          <input className="input" value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </Field>

        <EndpointFields title="IMAP (incoming)" value={imap} onChange={setImap} hostPlaceholder="imap.gmail.com" passwordOptional={editing} />
        <EndpointFields title="SMTP (outgoing)" value={smtp} onChange={setSmtp} hostPlaceholder="smtp.gmail.com" passwordOptional={editing} />

        <p className="muted email-hint">
          {editing ? (
            <>Leave a password blank to keep the stored one. Passwords are encrypted at rest.</>
          ) : (
            <>
              Tip: with Gmail/most providers, create an <strong>app password</strong> and use it here. Passwords are
              encrypted at rest.
            </>
          )}
        </p>
        {err && <p className="error">{err.message}</p>}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Save mailbox'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface Endpoint {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
}

function EndpointFields({
  title,
  value,
  onChange,
  hostPlaceholder,
  passwordOptional,
}: {
  title: string
  value: Endpoint
  onChange: (v: Endpoint) => void
  hostPlaceholder: string
  passwordOptional?: boolean
}) {
  return (
    <fieldset className="email-endpoint">
      <legend>{title}</legend>
      <Field label="Host">
        <input className="input" value={value.host} onChange={(e) => onChange({ ...value, host: e.target.value })} placeholder={hostPlaceholder} />
      </Field>
      <div className="email-endpoint-row">
        <Field label="Port">
          <input
            className="input"
            type="number"
            value={value.port}
            onChange={(e) => onChange({ ...value, port: Number(e.target.value) })}
          />
        </Field>
        <Field label="User">
          <input className="input" value={value.user} onChange={(e) => onChange({ ...value, user: e.target.value })} placeholder="you@example.com" />
        </Field>
      </div>
      <Field label={passwordOptional ? 'Password / app-password (leave blank to keep current)' : 'Password / app-password'}>
        <input
          className="input"
          type="password"
          value={value.password}
          placeholder={passwordOptional ? '•••••••• (unchanged)' : ''}
          onChange={(e) => onChange({ ...value, password: e.target.value })}
        />
      </Field>
    </fieldset>
  )
}
