import { Bell, BellOff, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useNoticeActions, useNotices, useScan } from '../api/pulse'
import { Markdown } from '../components/Markdown'
import { EmptyState, PageHeader } from '../components/ui'
import { useDesktopNotifications } from '../hooks/useDesktopNotifications'
import { formatDate } from '../lib/format'
import type { Notice } from '../lib/types'

/** Where a nudge's "Open" button navigates, by linked entity type. */
const LINK_ROUTE: Record<string, string> = {
  project: '/projects',
  task: '/tasks',
  habit: '/habits',
  rollup: '/memory',
  whatsapp: '/whatsapp',
  reflection: '/reflection',
  briefing: '/today',
  budget: '/budget',
  bill: '/budget',
  area: '/areas',
  calendar: '/today',
}

export function PulsePage() {
  const { data, isPending, isError, error } = useNotices()
  const actions = useNoticeActions()
  const scan = useScan()
  const desktop = useDesktopNotifications(data)
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Pulse"
        subtitle="What Cortex noticed — gentle nudges and your reviews"
        action={
          <div className="pulse-actions">
            {desktop.supported &&
              (desktop.enabled ? (
                <button className="btn ghost sm" onClick={desktop.disable} title="Desktop notifications on — click to turn off">
                  <Bell size={14} /> Notifying
                </button>
              ) : (
                <button className="btn ghost sm" onClick={() => void desktop.requestEnable()}>
                  <BellOff size={14} /> Notify me
                </button>
              ))}
            <button className="btn primary sm" onClick={() => scan.mutate()} disabled={scan.isPending}>
              <RefreshCw size={14} /> {scan.isPending ? 'Looking…' : 'Look now'}
            </button>
          </div>
        }
      />

      {scan.data?.skipped === 'quiet_hours' && <p className="muted">Quiet hours — Cortex is resting.</p>}
      {scan.data?.created === 0 && !scan.data.skipped && <p className="muted">Nothing new to surface right now.</p>}
      {isPending && <p className="muted">Loading…</p>}
      {isError && <p className="error">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <EmptyState
          message="All quiet. No nudges or reviews right now."
          hint="Cortex checks your data in the background and surfaces only what matters."
        />
      )}

      <div className="list">
        {data?.map((n) => (
          <NoticeCard
            key={n.id}
            notice={n}
            onRead={() => {
              if (n.status === 'unread') actions.read.mutate(n.id)
            }}
            onDismiss={() => actions.dismiss.mutate(n.id)}
            onOpen={() => {
              actions.act.mutate(n.id)
              // Agent alerts deep-link to the specific lane; others use the type route.
              const route =
                n.linkedType === 'area' && n.linkedId
                  ? `/areas/${n.linkedId}`
                  : n.linkedType
                    ? LINK_ROUTE[n.linkedType]
                    : undefined
              if (route) navigate(route)
            }}
          />
        ))}
      </div>
    </div>
  )
}

const KIND_LABEL: Record<string, string> = {
  nudge: 'nudge',
  daily_review: 'daily review',
  weekly_review: 'weekly review',
  morning_briefing: 'briefing',
  agent: 'life agent',
}

function NoticeCard({
  notice,
  onRead,
  onDismiss,
  onOpen,
}: {
  notice: Notice
  onRead: () => void
  onDismiss: () => void
  onOpen: () => void
}) {
  // Reviews/briefings render as markdown and aren't openable; nudges + agent alerts
  // are short, severity-colored, and deep-link out.
  const isReview = notice.kind !== 'nudge' && notice.kind !== 'agent'
  const sevClass = isReview
    ? 'info'
    : notice.severity === 'critical'
      ? 'bad'
      : notice.severity === 'warn'
        ? 'warn'
        : 'muted'
  const canOpen = !isReview && !!notice.linkedType && !!LINK_ROUTE[notice.linkedType]

  return (
    <div
      className={`card pulse-notice${notice.status === 'unread' ? ' unread' : ''}`}
      onClick={onRead}
    >
      <div className="pulse-notice-head">
        <span className="pulse-notice-title">
          {notice.status === 'unread' && <span className="pulse-dot" aria-label="unread" />}
          {notice.title}
        </span>
        <span className={`badge ${sevClass}`}>{KIND_LABEL[notice.kind]}</span>
      </div>
      {isReview ? (
        <Markdown source={notice.body} />
      ) : (
        <p className="pulse-notice-body">{notice.body}</p>
      )}
      <div className="pulse-notice-foot">
        <span className="mono muted">{formatDate(notice.createdAt)}</span>
        <div className="pulse-actions">
          {canOpen && (
            <button
              className="btn ghost sm"
              onClick={(e) => {
                e.stopPropagation()
                onOpen()
              }}
            >
              Open
            </button>
          )}
          <button
            className="btn ghost sm"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
