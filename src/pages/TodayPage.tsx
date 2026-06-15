import { useState, type FormEvent } from 'react'

import {
  BookOpen,
  CalendarDays,
  Check,
  CheckSquare,
  ClipboardCheck,
  Flame,
  FolderKanban,
  ListChecks,
  Mail,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { useBudgetSummary } from '../api/budget'
import {
  useAddSubscription,
  useCalendarSubscriptions,
  useCalendarSuggested,
  useConfirmEvent,
  useDismissEvent,
  useRemoveSubscription,
  useSyncSubscription,
} from '../api/calendar'
import { tasks, useToday, useToggleHabit } from '../api/hooks'
import { useDailyPrompt, useMorningBriefing, useRefreshBriefing } from '../api/reflection'
import { useSetupStatus } from '../api/setup'
import { Markdown } from '../components/Markdown'
import { Modal } from '../components/Modal'
import { Badge, Button, Card, Field, IconButton, Input, PageHeader, Stat } from '../components/ui'
import { formatDate, formatDay, formatMoney } from '../lib/format'
import { formatTime, useNow, useTimeFormat, type TimeFormat } from '../lib/time'
import type { CalendarEvent } from '../lib/types'

export function TodayPage() {
  const { data, isPending, isError, error } = useToday()
  const updateTask = tasks.useUpdate()
  const toggleHabit = useToggleHabit()
  const briefing = useMorningBriefing()
  const prompt = useDailyPrompt()
  const refreshBriefing = useRefreshBriefing()
  const budget = useBudgetSummary()
  const timeFmt = useTimeFormat()
  const now = useNow()

  if (isPending) return <p className="muted">Loading…</p>
  if (isError) return <p className="error">{(error as Error).message}</p>
  if (!data) return null

  const { tasks: t, projects, habits: h, journal } = data

  return (
    <div>
      <PageHeader title="Today" subtitle={`${formatDay(data.date)} · ${formatTime(now, timeFmt)}`} />

      <SetupBanner />

      {/* Morning briefing — verdict-first intelligence */}
      <Card
        variant="intelligence"
        hero
        eyebrow="Morning briefing"
        eyebrowIcon={<Sparkles size={15} />}
        actions={
          briefing.data && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshBriefing.mutate()}
              loading={refreshBriefing.isPending}
              icon={<RefreshCw size={13} />}
              title="Regenerate today's briefing"
            >
              Refresh
            </Button>
          )
        }
      >
        {briefing.data ? (
          <Markdown source={briefing.data.body} />
        ) : (
          <div className="briefing-empty">
            {prompt.data && <p className="briefing-prompt">{prompt.data.text}</p>}
            <Button
              variant="primary"
              size="sm"
              onClick={() => refreshBriefing.mutate()}
              loading={refreshBriefing.isPending}
              icon={<Sparkles size={14} />}
            >
              Generate briefing
            </Button>
          </div>
        )}
      </Card>

      <div className="summary-band">
        <Stat icon={<CheckSquare size={15} />} value={t.incompleteTotal} label="To do" hint={`${t.completedToday} done today`} />
        <Stat icon={<Flame size={15} />} value={`${h.doneCount}/${h.dueTotal}`} label="Habits" />
        <Stat icon={<BookOpen size={15} />} value={journal.hasEntryToday ? 'yes' : '—'} label="Journaled" />
        {budget.data && (
          <Stat
            icon={<Wallet size={15} />}
            value={formatMoney(budget.data.overall.spent, budget.data.currency.code)}
            label="Spent"
          />
        )}
      </div>

      <CalendarSection events={data.events ?? []} />

      <div className="today-panels">
        <Card hero eyebrow="Do this first" eyebrowIcon={<ListChecks size={15} />} className="span-2">
          {t.doFirst.length === 0 && <p className="muted">Nothing urgent &amp; important right now.</p>}
          {t.doFirst.map((task) => (
            <label key={task.id} className="today-row">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => updateTask.mutate({ id: task.id, body: { completed: true } })}
              />
              <span>{task.title}</span>
              {task.dueDate && <span className="muted small mono">{formatDate(task.dueDate)}</span>}
            </label>
          ))}
          <div className="quad-summary">
            {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
              <span key={q} className="quad-chip">
                <span className="mono">{q}</span> {t.quadrantCounts[q]}
              </span>
            ))}
          </div>
        </Card>

        <Card eyebrow="Habits" eyebrowIcon={<Flame size={15} />}>
          {h.items.length === 0 && <p className="muted">No habits due today.</p>}
          {h.items.map((habit) => (
            <div key={habit.id} className="today-row">
              <button
                className={`check${habit.doneToday ? ' done' : ''}`}
                aria-label={habit.doneToday ? 'Mark not done' : 'Mark done'}
                onClick={() => toggleHabit.mutate({ id: habit.id, done: !habit.doneToday })}
              >
                {habit.doneToday && <Check size={13} strokeWidth={3} />}
              </button>
              <span className={habit.doneToday ? 'struck' : ''}>{habit.name}</span>
              <span className="muted small streak">
                <Flame size={12} /> {habit.currentStreak}
              </span>
            </div>
          ))}
        </Card>

        <Card eyebrow="What I'm building" eyebrowIcon={<FolderKanban size={15} />}>
          {projects.length === 0 && <p className="muted">No active projects.</p>}
          {projects.map((project) => (
            <div key={project.id} className="today-row">
              <span>{project.title}</span>
              {project.overdue && <Badge kind="bad">overdue</Badge>}
              <span className="muted small mono">w{project.weight}</span>
            </div>
          ))}
        </Card>

        <Card eyebrow="Journal" eyebrowIcon={<BookOpen size={15} />} className="span-2">
          {journal.entries.length === 0 ? (
            <p className="muted">No entry today yet.</p>
          ) : (
            journal.entries.map((entry) => (
              <p key={entry.id} className="journal-content">
                {entry.content}
              </p>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}

const SETUP_BANNER_KEY = 'cortex.setupBannerDismissed'

/** Shown until the required setup items are complete; dismissible per device. */
function SetupBanner() {
  const { data } = useSetupStatus()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(SETUP_BANNER_KEY) === '1',
  )

  if (!data || dismissed) return null
  if (data.essentialsTotal === 0 || data.essentialsDone >= data.essentialsTotal) return null

  return (
    <div className="setup-banner">
      <ClipboardCheck size={18} className="setup-banner-ic" />
      <div className="setup-banner-body">
        <strong>Finish setting up Cortex</strong>
        <span className="muted small">
          {data.essentialsDone}/{data.essentialsTotal} essentials done — add a local model so Cortex can think.
        </span>
      </div>
      <Link className="btn primary sm" to="/setup">
        Open setup guide
      </Link>
      <button
        className="setup-banner-x"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(SETUP_BANNER_KEY, '1')
          setDismissed(true)
        }}
      >
        <X size={15} />
      </button>
    </div>
  )
}

function fmtEventWhen(e: CalendarEvent, fmt: TimeFormat): string {
  const s = new Date(e.start)
  const day = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  if (e.allDay) return `${day} · all day`
  return `${day} · ${formatTime(s, fmt)}`
}

function CalendarSection({ events }: { events: CalendarEvent[] }) {
  const suggested = useCalendarSuggested()
  const confirm = useConfirmEvent()
  const dismiss = useDismissEvent()
  const timeFmt = useTimeFormat()
  const [manage, setManage] = useState(false)
  const pending = (suggested.data ?? []).filter((e) => e.status === 'suggested')

  return (
    <Card
      eyebrow="On your calendar"
      eyebrowIcon={<CalendarDays size={15} />}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setManage(true)} icon={<Settings2 size={13} />} title="Manage calendar feeds">
          Feeds
        </Button>
      }
    >
      {events.length === 0 && pending.length === 0 && (
        <p className="muted small">
          No upcoming events. Add an iCal feed under <strong>Feeds</strong>, or events found in your email will
          appear here to confirm.
        </p>
      )}

      {events.length > 0 && (
        <div className="cal-events">
          {events.map((e) => (
            <div key={e.id} className="cal-event">
              <span className="cal-when mono">{fmtEventWhen(e, timeFmt)}</span>
              <span className="cal-title">{e.title}</span>
              {e.location && <span className="muted small">· {e.location}</span>}
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="cal-pending">
          <span className="muted small">
            <Mail size={12} /> Found in your email — confirm to add
          </span>
          {pending.map((e) => (
            <div key={e.id} className="cal-event cal-event-suggested">
              <span className="cal-when mono">{fmtEventWhen(e, timeFmt)}</span>
              <span className="cal-title">{e.title}</span>
              <span className="cal-event-actions">
                <Button variant="ghost" size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate(e.id)} icon={<Check size={13} />}>
                  Add
                </Button>
                <Button variant="ghost" size="sm" disabled={dismiss.isPending} onClick={() => dismiss.mutate(e.id)} icon={<X size={13} />}>
                  {''}
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}

      {manage && <CalendarFeedsModal onClose={() => setManage(false)} />}
    </Card>
  )
}

function CalendarFeedsModal({ onClose }: { onClose: () => void }) {
  const subs = useCalendarSubscriptions()
  const add = useAddSubscription()
  const sync = useSyncSubscription()
  const remove = useRemoveSubscription()
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !url.trim()) return
    add.mutate(
      { label: label.trim(), url: url.trim() },
      {
        onSuccess: (s) => {
          setLabel('')
          setUrl('')
          sync.mutate((s as { id: string }).id) // first sync immediately
        },
      },
    )
  }

  return (
    <Modal title="Calendar feeds (read-only)" onClose={onClose}>
      <div className="cal-feeds">
        {(subs.data ?? []).length === 0 && <p className="muted small">No feeds yet.</p>}
        {(subs.data ?? []).map((s) => (
          <div key={s.id} className="cal-feed">
            <span className="dot" style={{ background: s.color }} />
            <div className="cal-feed-body">
              <strong>{s.label}</strong>
              <span className="muted small">
                {s.urlHint} ·{' '}
                {s.lastStatus === 'ok'
                  ? `${s.eventCount} events`
                  : s.lastStatus === 'error'
                    ? `error: ${s.lastError ?? 'failed'}`
                    : 'not synced yet'}
              </span>
            </div>
            <IconButton label="Sync now" disabled={sync.isPending} onClick={() => sync.mutate(s.id)}>
              <RefreshCw size={14} className={sync.isPending ? 'spin' : undefined} />
            </IconButton>
            <IconButton
              label="Remove feed"
              danger
              onClick={() => {
                if (confirm(`Remove "${s.label}" and its events?`)) remove.mutate(s.id)
              }}
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
      </div>

      <form className="form cal-feed-add" onSubmit={submit}>
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Personal" />
        </Field>
        <Field label="Secret iCal (.ics) URL">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendar.google.com/…/basic.ics"
          />
        </Field>
        <p className="muted small">
          Read-only — Cortex only fetches this feed, never writes to your calendar. In Google Calendar:
          Settings → your calendar → “Secret address in iCal format”.
        </p>
        {add.isError && <p className="error small">{(add.error as Error).message}</p>}
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" variant="primary" disabled={!label.trim() || !url.trim()} loading={add.isPending} icon={<Plus size={14} />}>
            Add feed
          </Button>
        </div>
      </form>
    </Modal>
  )
}
