import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  ArrowLeft,
  CalendarPlus,
  CheckSquare,
  Link2,
  RefreshCw,
  Search,
  ShieldCheck,
  Unplug,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'

import {
  useWhatsAppActions,
  useWhatsAppChatMessages,
  useWhatsAppChats,
  useWhatsAppStatus,
  useWhatsAppSuggestions,
  useWhatsAppSummaries,
} from '../api/whatsapp'
import { ActionItemForm } from '../components/ActionItemForm'
import { Markdown } from '../components/Markdown'
import { EmptyState, PageHeader } from '../components/ui'
import { formatDate } from '../lib/format'
import { formatTime } from '../lib/time'
import type { DumpItem, WhatsAppChat, WhatsAppMessage, WhatsAppStatus, WhatsAppSuggestion, WhatsAppSummary } from '../lib/types'

/** A human label for a chat, with a sensible fallback when the name is still a raw JID. */
function waName(name: string | undefined | null, jid?: string): string {
  const n = (name ?? '').trim()
  const looksRaw = (s: string): boolean => /@(lid|s\.whatsapp\.net|c\.us|g\.us|broadcast|newsletter)$/.test(s)
  if (n && !looksRaw(n)) return n
  const ref = jid ?? n
  if (/@g\.us$/.test(ref)) return 'Group chat'
  if (/@lid$/.test(ref)) return 'Unknown contact' // a privacy id, not a phone number
  const base = ref.split('@')[0] ?? ''
  if (/^\d{6,}$/.test(base)) return `+${base}` // real phone-number JID
  return base || 'Chat'
}

function ReadOnlyBanner() {
  return (
    <div className="wa-readonly">
      <ShieldCheck size={16} />
      <span>
        <strong>Read-only.</strong> Cortex reads your chats to consolidate them — it never sends,
        replies, or runs commands. All content stays on this machine.
      </span>
    </div>
  )
}

export function WhatsAppPage() {
  const status = useWhatsAppStatus()
  const actions = useWhatsAppActions()

  if (status.isPending) return <p className="muted">Loading…</p>
  const data = status.data

  if (!data?.enabled) {
    return (
      <div>
        <PageHeader title="WhatsApp" subtitle="Read-only chat consolidation" />
        <EmptyState
          message="WhatsApp ingestion is turned off."
          hint="Set WHATSAPP_ENABLED=true in backend/env/.env.local, then restart."
        />
      </div>
    )
  }

  // Show the consolidated data whenever a device is LINKED (hasSession) — not only
  // while the live socket says 'connected'. Baileys cycles through 'connecting' on
  // every reconnect (page visits, after any mutation refetches status), and gating
  // the whole view on the transient connection state hid all the data behind
  // "Connecting…". We only fall back to pairing when there's no session yet or the
  // phone unlinked us. A brief "Reconnecting…" hint covers the transient state.
  const linked = data.hasSession && data.connection !== 'logged_out'
  const reconnecting = linked && data.connection !== 'connected'

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        subtitle="Cortex quietly reads your chats and turns them into events, summaries & memory"
        action={
          linked && (
            <div className="pulse-actions">
              {reconnecting && (
                <span className="muted small wa-reconnecting">
                  <Link2 size={13} /> Reconnecting…
                </span>
              )}
              <button
                className="btn ghost sm"
                onClick={() => actions.consolidate.mutate()}
                disabled={actions.consolidate.isPending}
              >
                <RefreshCw size={14} /> {actions.consolidate.isPending ? 'Consolidating…' : 'Consolidate now'}
              </button>
              <button
                className="btn ghost sm"
                onClick={() => {
                  if (confirm('Unlink Cortex from WhatsApp? You can re-pair by scanning a new QR.'))
                    actions.unlink.mutate()
                }}
              >
                <Unplug size={14} /> Unlink
              </button>
            </div>
          )
        }
      />

      <ReadOnlyBanner />

      {linked ? <ConnectedView status={data} /> : <PairingView status={data} />}
    </div>
  )
}

function PairingView({ status }: { status: WhatsAppStatus }) {
  const { connection, qr } = status
  return (
    <div className="wa-pair card">
      {connection === 'qr' && qr ? (
        <>
          <h3>Link Cortex to WhatsApp</h3>
          <ol className="wa-steps">
            <li>Open WhatsApp on your phone.</li>
            <li>
              Tap <strong>Settings → Linked Devices → Link a device</strong>.
            </li>
            <li>Point your phone at this code.</li>
          </ol>
          <div className="wa-qr">
            <img src={qr} alt="WhatsApp pairing QR code" width={264} height={264} />
          </div>
          <p className="muted">It links as “Cortex (read-only)”. The code refreshes automatically.</p>
        </>
      ) : connection === 'connecting' ? (
        <p className="muted">
          <Link2 size={15} /> Connecting to WhatsApp…
        </p>
      ) : connection === 'logged_out' ? (
        <EmptyState
          message="Unlinked from your phone."
          hint="A fresh pairing QR will appear here in a moment — keep this page open."
        />
      ) : (
        <EmptyState
          message="Not linked yet."
          hint="A pairing QR will appear here shortly. If it doesn't, restart the backend."
        />
      )}
    </div>
  )
}

function ConnectedView({ status }: { status: WhatsAppStatus }) {
  const [tab, setTab] = useState<'suggestions' | 'summaries' | 'chats'>('suggestions')
  const { counts, scope, lastEventAt } = status

  return (
    <>
      <div className="wa-stats">
        <Stat label="Chats" value={counts.chats} />
        <Stat label="Messages" value={counts.messages} />
        <Stat label="Summaries" value={counts.summaries} />
        <Stat label="To review" value={counts.pendingSuggestions} />
      </div>
      <p className="muted wa-scope">
        Including 1:1 chats{scope.groups ? ' + groups' : ''} · excluding archived
        {scope.archived ? '' : ''}, communities & channels
        {lastEventAt ? ` · last activity ${formatDate(lastEventAt)}` : ''}
      </p>

      <div className="filter-row">
        <button className={`chip${tab === 'suggestions' ? ' active' : ''}`} onClick={() => setTab('suggestions')}>
          To review
        </button>
        <button className={`chip${tab === 'summaries' ? ' active' : ''}`} onClick={() => setTab('summaries')}>
          Summaries
        </button>
        <button className={`chip${tab === 'chats' ? ' active' : ''}`} onClick={() => setTab('chats')}>
          Chats
        </button>
      </div>

      {tab === 'suggestions' && <SuggestionsTab />}
      {tab === 'summaries' && <SummariesTab />}
      {tab === 'chats' && <ChatsTab />}
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="wa-stat">
      <span className="wa-stat-value mono">{value}</span>
      <span className="wa-stat-label">{label}</span>
    </div>
  )
}

function SuggestionsTab() {
  const { data, isPending } = useWhatsAppSuggestions()
  const actions = useWhatsAppActions()

  if (isPending) return <p className="muted">Loading…</p>
  if (!data?.length)
    return (
      <EmptyState
        message="Nothing to review."
        hint="As Cortex consolidates your chats, plans and to-dos it spots will appear here for you to add."
      />
    )

  return (
    <div className="list">
      {data.map((s) => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          onAdd={(item) => actions.addSuggestion.mutate({ id: s.id, item })}
          onDismiss={() => actions.dismissSuggestion.mutate(s.id)}
          busy={actions.addSuggestion.isPending || actions.dismissSuggestion.isPending}
        />
      ))}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  onAdd,
  onDismiss,
  busy,
}: {
  suggestion: WhatsAppSuggestion
  onAdd: (item?: Partial<DumpItem>) => void
  onDismiss: () => void
  busy: boolean
}) {
  const [editing, setEditing] = useState(false)
  const isEvent = suggestion.type === 'event'
  return (
    <div className="card wa-suggestion">
      <div className="wa-suggestion-head">
        <span className={`badge ${isEvent ? 'info' : 'muted'}`}>{isEvent ? 'event' : 'to-do'}</span>
        <strong>{suggestion.title}</strong>
      </div>
      <p className="muted wa-suggestion-meta">
        {`From ${waName(suggestion.chatName, suggestion.chatJid)}`}
        {suggestion.whenISO ? ` · ${formatDate(suggestion.whenISO)}` : ''}
      </p>
      {editing ? (
        <ActionItemForm
          initial={{
            type: isEvent ? 'event' : 'task',
            title: suggestion.title,
            when: suggestion.whenISO ?? null,
          }}
          busy={busy}
          submitLabel="Add"
          onSubmit={(item) => onAdd(item)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="wa-suggestion-foot">
          <button className="btn primary sm" onClick={() => onAdd()} disabled={busy}>
            {isEvent ? <CalendarPlus size={14} /> : <CheckSquare size={14} />}{' '}
            {isEvent ? 'Add reminder' : 'Add task'}
          </button>
          <button className="btn ghost sm" onClick={() => setEditing(true)} disabled={busy}>
            Edit
          </button>
          <button className="btn ghost sm" onClick={onDismiss} disabled={busy}>
            <X size={14} /> Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

function SummariesTab() {
  const { data, isPending } = useWhatsAppSummaries()
  if (isPending) return <p className="muted">Loading…</p>
  if (!data?.length)
    return (
      <EmptyState
        message="No summaries yet."
        hint="Cortex writes a rolling summary per chat as it consolidates. Check back after some activity."
      />
    )
  return (
    <div className="list">
      {data.map((s: WhatsAppSummary) => (
        <div key={s.id} className="card wa-summary">
          <div className="wa-summary-head">
            <strong>{waName(s.chatName, s.chatJid)}</strong>
            <span className="mono muted">{s.messageCount} msgs{s.lastMessageAt ? ` · ${formatDate(s.lastMessageAt)}` : ''}</span>
          </div>
          <Markdown source={s.summary} />
        </div>
      ))}
    </div>
  )
}

function ChatsTab() {
  const { data, isPending } = useWhatsAppChats()
  const actions = useWhatsAppActions()
  const [selected, setSelected] = useState<WhatsAppChat | null>(null)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = data ?? []
    if (!needle) return list
    return list.filter((c) => waName(c.name, c.jid).toLowerCase().includes(needle))
  }, [data, q])

  if (isPending) return <p className="muted">Loading…</p>
  if (!data?.length)
    return <EmptyState message="No chats observed yet." hint="They'll appear as messages arrive." />

  return (
    <div className={`thread-pane${selected ? ' has-selection' : ''}`}>
      <div className="thread-list">
        <div className="thread-search">
          <Search size={14} />
          <input
            className="thread-search-input"
            placeholder="Search chats…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="list thread-list-scroll">
          {filtered.map((c: WhatsAppChat) => (
            <button
              key={c.jid}
              className={`wa-chat-row${c.jid === selected?.jid ? ' active' : ''}${c.ingesting ? '' : ' excluded'}`}
              onClick={() => setSelected(c)}
            >
              <span className="wa-chat-icon">
                {c.kind === 'group' ? <Users size={16} /> : <User size={16} />}
              </span>
              <span className="wa-chat-main">
                <strong>{waName(c.name, c.jid)}</strong>
                <span className="muted mono">
                  {c.messageCount} msgs
                  {c.ingesting ? '' : ` · excluded (${c.excludedReason})`}
                </span>
              </span>
              <span
                className="icon-btn wa-chat-mute"
                role="button"
                tabIndex={-1}
                aria-label={c.muted ? 'Unmute chat' : 'Mute chat'}
                title={c.muted ? 'Muted — click to include' : 'Mute (stop ingesting this chat)'}
                onClick={(e) => {
                  e.stopPropagation()
                  actions.mute.mutate({ jid: c.jid, muted: !c.muted })
                }}
              >
                {c.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </span>
            </button>
          ))}
          {filtered.length === 0 && <p className="muted small thread-empty">No chats match “{q}”.</p>}
        </div>
      </div>

      <div className="thread-detail">
        {selected ? (
          <WhatsAppConversation chat={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="thread-detail-empty">
            <EmptyState message="Select a chat" hint="Pick a conversation on the left to read its messages." />
          </div>
        )}
      </div>
    </div>
  )
}

/** Read-only message thread for one chat — bubbles, oldest→newest, load-older on scroll up. */
function WhatsAppConversation({ chat, onBack }: { chat: WhatsAppChat; onBack: () => void }) {
  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = useWhatsAppChatMessages(chat.jid)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevHeightRef = useRef(0)
  const atBottomRef = useRef(true)

  // Pages are newest-first; flatten then reverse to render oldest→newest.
  const messages = useMemo<WhatsAppMessage[]>(
    () => (data?.pages ? [...data.pages.flat()].reverse() : []),
    [data],
  )

  // Initial load: jump to the newest message (bottom).
  useEffect(() => {
    const el = scrollRef.current
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messages.length])

  // After prepending older messages, keep the viewport anchored where the user was.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (prevHeightRef.current && el.scrollHeight > prevHeightRef.current && !atBottomRef.current) {
      el.scrollTop += el.scrollHeight - prevHeightRef.current
    }
    prevHeightRef.current = el.scrollHeight
  }, [messages])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (el.scrollTop < 60 && hasNextPage && !isFetchingNextPage) {
      prevHeightRef.current = el.scrollHeight
      void fetchNextPage()
    }
  }

  return (
    <div className="wa-convo">
      <header className="wa-convo-head">
        <button className="icon-btn wa-back" aria-label="Back to chats" onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
        <span className="wa-convo-icon">{chat.kind === 'group' ? <Users size={16} /> : <User size={16} />}</span>
        <div className="wa-convo-title">
          <strong>{waName(chat.name, chat.jid)}</strong>
          <span className="muted mono">{chat.messageCount} msgs</span>
        </div>
      </header>

      <div className="wa-convo-body" ref={scrollRef} onScroll={onScroll}>
        {isFetchingNextPage && <p className="muted small wa-loading-older">Loading older…</p>}
        {isPending ? (
          <p className="muted">Loading…</p>
        ) : messages.length === 0 ? (
          <EmptyState message="No messages stored for this chat yet." />
        ) : (
          messages.map((m, i) => {
            const showSender = chat.kind === 'group' && !m.fromMe && m.senderName && m.senderName !== messages[i - 1]?.senderName
            return (
              <div key={m.id ?? m.msgId} className={`wa-bubble-row${m.fromMe ? ' me' : ''}`}>
                <div className="wa-bubble">
                  {showSender && <span className="wa-bubble-sender">{m.senderName}</span>}
                  <span className="wa-bubble-text">{m.text}</span>
                  <span className="wa-bubble-time">{formatTime(m.ts)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <footer className="wa-convo-foot muted small">
        <ShieldCheck size={13} /> Read-only — Cortex never replies.
      </footer>
    </div>
  )
}
