import { useState } from 'react'

import {
  CalendarPlus,
  CheckSquare,
  Link2,
  RefreshCw,
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
  useWhatsAppChats,
  useWhatsAppStatus,
  useWhatsAppSuggestions,
  useWhatsAppSummaries,
} from '../api/whatsapp'
import { Markdown } from '../components/Markdown'
import { EmptyState, PageHeader } from '../components/ui'
import { formatDate } from '../lib/format'
import type { WhatsAppChat, WhatsAppStatus, WhatsAppSuggestion, WhatsAppSummary } from '../lib/types'

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

  const connected = data.connection === 'connected'

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        subtitle="Cortex quietly reads your chats and turns them into events, summaries & memory"
        action={
          connected && (
            <div className="pulse-actions">
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

      {connected ? <ConnectedView status={data} /> : <PairingView status={data} />}
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
          onAdd={() => actions.addSuggestion.mutate(s.id)}
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
  onAdd: () => void
  onDismiss: () => void
  busy: boolean
}) {
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
      <div className="wa-suggestion-foot">
        <button className="btn primary sm" onClick={onAdd} disabled={busy}>
          {isEvent ? <CalendarPlus size={14} /> : <CheckSquare size={14} />}{' '}
          {isEvent ? 'Add reminder' : 'Add task'}
        </button>
        <button className="btn ghost sm" onClick={onDismiss} disabled={busy}>
          <X size={14} /> Dismiss
        </button>
      </div>
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
  if (isPending) return <p className="muted">Loading…</p>
  if (!data?.length)
    return <EmptyState message="No chats observed yet." hint="They'll appear as messages arrive." />
  return (
    <div className="list">
      {data.map((c: WhatsAppChat) => (
        <div key={c.jid} className={`card wa-chat${c.ingesting ? '' : ' excluded'}`}>
          <span className="wa-chat-icon">
            {c.kind === 'group' ? <Users size={16} /> : <User size={16} />}
          </span>
          <div className="wa-chat-main">
            <strong>{waName(c.name, c.jid)}</strong>
            <span className="muted mono">
              {c.messageCount} msgs
              {c.ingesting ? '' : ` · excluded (${c.excludedReason})`}
            </span>
          </div>
          <button
            className="icon-btn"
            aria-label={c.muted ? 'Unmute chat' : 'Mute chat'}
            title={c.muted ? 'Muted — click to include' : 'Mute (stop ingesting this chat)'}
            onClick={() => actions.mute.mutate({ jid: c.jid, muted: !c.muted })}
          >
            {c.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      ))}
    </div>
  )
}
