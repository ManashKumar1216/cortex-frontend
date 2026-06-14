import { useState, type FormEvent } from 'react'

import { CalendarDays, Check, Mail, Plus, RefreshCw, Settings2, Sparkles, Trash2, X } from 'lucide-react'

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
import { Markdown } from '../components/Markdown'
import { Modal } from '../components/Modal'
import { Field, PageHeader } from '../components/ui'
import { formatDate, formatDay, formatMoney } from '../lib/format'
import type { CalendarEvent } from '../lib/types'

export function TodayPage() {
  const { data, isPending, isError, error } = useToday()
  const updateTask = tasks.useUpdate()
  const toggleHabit = useToggleHabit()
  const briefing = useMorningBriefing()
  const prompt = useDailyPrompt()
  const refreshBriefing = useRefreshBriefing()
  const budget = useBudgetSummary()

  if (isPending) return <p className="muted">Loading…</p>
  if (isError) return <p className="error">{(error as Error).message}</p>
  if (!data) return null

  const { tasks: t, projects, habits: h, journal } = data

  return (
    <div>
      <PageHeader title="Today" subtitle={formatDay(data.date)} />

      {/* Morning briefing (Phase 11) */}
      {briefing.data ? (
        <section className="card briefing-card">
          <div className="row-between">
            <div className="briefing-head">
              <Sparkles size={16} /> Morning briefing
            </div>
            <button
              className="btn ghost sm"
              onClick={() => refreshBriefing.mutate()}
              disabled={refreshBriefing.isPending}
              title="Regenerate today's briefing"
            >
              <RefreshCw size={13} /> {refreshBriefing.isPending ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <Markdown source={briefing.data.body} />
        </section>
      ) : (
        <section className="card briefing-card briefing-empty">
          <div className="briefing-head">
            <Sparkles size={16} /> Morning briefing
          </div>
          {prompt.data && <p className="prompt-text">{prompt.data.text}</p>}
          <button
            className="btn primary sm"
            onClick={() => refreshBriefing.mutate()}
            disabled={refreshBriefing.isPending}
          >
            <Sparkles size={14} /> {refreshBriefing.isPending ? 'Generating…' : 'Generate briefing'}
          </button>
        </section>
      )}

      <div className="stat-row">
        <Stat label="To do" value={t.incompleteTotal} />
        <Stat label="Done today" value={t.completedToday} />
        <Stat label="Habits" value={`${h.doneCount}/${h.dueTotal}`} />
        <Stat label="Journaled" value={journal.hasEntryToday ? 'yes' : 'no'} />
        {budget.data && (
          <Stat
            label="Spent"
            value={formatMoney(budget.data.overall.spent, budget.data.currency.code)}
          />
        )}
      </div>

      <CalendarSection events={data.events ?? []} />

      <div className="today-grid">
        <section className="card">
          <h2>Do this first</h2>
          {t.doFirst.length === 0 && <p className="muted">Nothing urgent &amp; important. 🎉</p>}
          {t.doFirst.map((task) => (
            <label key={task.id} className="today-row">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => updateTask.mutate({ id: task.id, body: { completed: true } })}
              />
              <span>{task.title}</span>
              {task.dueDate && <span className="muted small">{formatDate(task.dueDate)}</span>}
            </label>
          ))}
          <p className="muted small spaced">
            Q1 {t.quadrantCounts.Q1} · Q2 {t.quadrantCounts.Q2} · Q3 {t.quadrantCounts.Q3} · Q4{' '}
            {t.quadrantCounts.Q4}
          </p>
        </section>

        <section className="card">
          <h2>Habits</h2>
          {h.items.length === 0 && <p className="muted">No habits due today.</p>}
          {h.items.map((habit) => (
            <div key={habit.id} className="today-row">
              <button
                className={`check${habit.doneToday ? ' done' : ''}`}
                onClick={() => toggleHabit.mutate({ id: habit.id, done: !habit.doneToday })}
              >
                {habit.doneToday ? '✓' : ''}
              </button>
              <span className={habit.doneToday ? 'struck' : ''}>{habit.name}</span>
              <span className="muted small">🔥 {habit.currentStreak}</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>What I'm building</h2>
          {projects.length === 0 && <p className="muted">No active projects.</p>}
          {projects.map((project) => (
            <div key={project.id} className="today-row">
              <span>{project.title}</span>
              {project.overdue && <span className="badge bad">overdue</span>}
              <span className="muted small">w{project.weight}</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>Journal</h2>
          {journal.entries.length === 0 ? (
            <p className="muted">No entry today yet.</p>
          ) : (
            journal.entries.map((entry) => <p key={entry.id} className="journal-content">{entry.content}</p>)
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function fmtEventWhen(e: CalendarEvent): string {
  const s = new Date(e.start)
  const day = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  if (e.allDay) return `${day} · all day`
  const time = s.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

function CalendarSection({ events }: { events: CalendarEvent[] }) {
  const suggested = useCalendarSuggested()
  const confirm = useConfirmEvent()
  const dismiss = useDismissEvent()
  const [manage, setManage] = useState(false)
  const pending = (suggested.data ?? []).filter((e) => e.status === 'suggested')

  return (
    <section className="card cal-section">
      <div className="row-between">
        <h2>
          <CalendarDays size={16} /> On your calendar
        </h2>
        <button className="btn ghost sm" onClick={() => setManage(true)} title="Manage calendar feeds">
          <Settings2 size={13} /> Feeds
        </button>
      </div>

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
              <span className="cal-when mono">{fmtEventWhen(e)}</span>
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
              <span className="cal-when mono">{fmtEventWhen(e)}</span>
              <span className="cal-title">{e.title}</span>
              <span className="cal-event-actions">
                <button className="btn ghost sm" disabled={confirm.isPending} onClick={() => confirm.mutate(e.id)}>
                  <Check size={13} /> Add
                </button>
                <button className="btn ghost sm" disabled={dismiss.isPending} onClick={() => dismiss.mutate(e.id)}>
                  <X size={13} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {manage && <CalendarFeedsModal onClose={() => setManage(false)} />}
    </section>
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
            <button className="btn ghost sm" disabled={sync.isPending} onClick={() => sync.mutate(s.id)} title="Sync now">
              <RefreshCw size={13} className={sync.isPending ? 'spin' : undefined} />
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                if (confirm(`Remove "${s.label}" and its events?`)) remove.mutate(s.id)
              }}
              aria-label="Remove feed"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <form className="form cal-feed-add" onSubmit={submit}>
        <Field label="Label">
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Personal" />
        </Field>
        <Field label="Secret iCal (.ics) URL">
          <input
            className="input"
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
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
          <button type="submit" className="btn primary" disabled={!label.trim() || !url.trim() || add.isPending}>
            <Plus size={14} /> {add.isPending ? 'Adding…' : 'Add feed'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
