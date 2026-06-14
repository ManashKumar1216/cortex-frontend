import { useEffect, useState, type FormEvent } from 'react'

import { Archive, Plus, RefreshCw, Reply, Send, Trash2 } from 'lucide-react'

import {
  useEmailAccountActions,
  useEmailAccounts,
  useEmailMessageActions,
  useEmailMessages,
  useEmailStatus,
  usePollEmail,
} from '../api/email'
import { Modal } from '../components/Modal'
import { EmptyState, Field, PageHeader } from '../components/ui'
import { formatDate } from '../lib/format'
import type { EmailAccount, EmailDraft, EmailMessage } from '../lib/types'

export function EmailPage() {
  const status = useEmailStatus()
  const accounts = useEmailAccounts()
  const poll = usePollEmail()
  const [adding, setAdding] = useState(false)

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
            <button className="btn primary sm" onClick={() => setAdding(true)}>
              <Plus size={14} /> Add mailbox
            </button>
          </div>
        }
      />

      <AccountsStrip accounts={accounts.data ?? []} />

      {poll.data && <p className="muted">Fetched {poll.data.handled} new message(s).</p>}

      {hasAccounts ? (
        <Inbox />
      ) : (
        <EmptyState message="No mailbox yet. Add one to start triaging your inbox." />
      )}

      {adding && <AddAccountModal onClose={() => setAdding(false)} />}
    </div>
  )
}

function AccountsStrip({ accounts }: { accounts: EmailAccount[] }) {
  const { remove, test } = useEmailAccountActions()
  const [result, setResult] = useState<Record<string, string>>({})

  if (!accounts.length) return null
  return (
    <div className="email-accounts">
      {accounts.map((a) => (
        <div key={a.id} className="email-account">
          <div>
            <strong>{a.label}</strong> <span className="mono muted">{a.email}</span>
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
              Test
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

function Inbox() {
  const [cat, setCat] = useState<string>('action')
  const { data, isPending } = useEmailMessages(cat)
  const [replyTo, setReplyTo] = useState<EmailMessage | null>(null)

  return (
    <section className="email-inbox">
      <div className="filter-row">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`chip${cat === c.key ? ' active' : ''}`}
            onClick={() => setCat(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isPending && <p className="muted">Loading…</p>}
      {data && data.length === 0 && <EmptyState message="Nothing here. Poll to fetch new mail." />}

      <div className="list">
        {data?.map((m) => (
          <MessageCard key={m.id} message={m} onReply={() => setReplyTo(m)} />
        ))}
      </div>

      {replyTo && <ReplyModal message={replyTo} onClose={() => setReplyTo(null)} />}
    </section>
  )
}

function MessageCard({ message, onReply }: { message: EmailMessage; onReply: () => void }) {
  const { archive } = useEmailMessageActions()
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
          <button className="btn ghost sm" onClick={onReply}>
            <Reply size={14} /> Reply
          </button>
          <button className="icon-btn" aria-label="Archive" onClick={() => archive.mutate(message.id)}>
            <Archive size={15} />
          </button>
        </div>
      </div>
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

function AddAccountModal({ onClose }: { onClose: () => void }) {
  const { create } = useEmailAccountActions()
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [imap, setImap] = useState(endpointDefaults('imap'))
  const [smtp, setSmtp] = useState(endpointDefaults('smtp'))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !email.trim() || !imap.host || !smtp.host) return
    create.mutate(
      { label, email, fromName: fromName || undefined, imap, smtp },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal title="Add a mailbox" onClose={onClose}>
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

        <EndpointFields title="IMAP (incoming)" value={imap} onChange={setImap} hostPlaceholder="imap.gmail.com" />
        <EndpointFields title="SMTP (outgoing)" value={smtp} onChange={setSmtp} hostPlaceholder="smtp.gmail.com" />

        <p className="muted email-hint">
          Tip: with Gmail/most providers, create an <strong>app password</strong> and use it here. Passwords are
          encrypted at rest.
        </p>
        {create.isError && <p className="error">{(create.error as Error).message}</p>}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Save mailbox'}
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
}: {
  title: string
  value: Endpoint
  onChange: (v: Endpoint) => void
  hostPlaceholder: string
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
      <Field label="Password / app-password">
        <input
          className="input"
          type="password"
          value={value.password}
          onChange={(e) => onChange({ ...value, password: e.target.value })}
        />
      </Field>
    </fieldset>
  )
}
