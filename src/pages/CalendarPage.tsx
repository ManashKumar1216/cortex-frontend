import { useMemo, useState, type FormEvent } from 'react'

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import {
  useCalendarEvents,
  useConfirmEvent,
  useCreateLocalEvent,
  useDeleteLocalEvent,
  useDismissEvent,
  useUpdateLocalEvent,
  type LocalEventInput,
} from '../api/calendar'
import { Modal } from '../components/Modal'
import { PageHeader, useToast } from '../components/ui'
import { formatTime, formatTimeRange, useTimeFormat, type TimeFormat } from '../lib/time'
import type { CalendarEvent } from '../lib/types'

const DAY_MS = 86_400_000
const SOURCE_LABEL: Record<string, string> = { local: 'You', ics: 'Synced', email: 'From email' }

/** Monday 00:00 of the week containing `d` (local time). */
function weekStartOf(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dow = (x.getDay() + 6) % 7 // 0=Mon
  x.setDate(x.getDate() - dow)
  return x
}

const ymd = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayLabel = (d: Date): string => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

function eventTime(e: CalendarEvent, fmt: TimeFormat): string {
  if (e.allDay) return 'All day'
  return e.end ? formatTimeRange(e.start, e.end, fmt) : formatTime(e.start, fmt)
}

export function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()))
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [creating, setCreating] = useState<Date | null>(null)

  const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS)
  const events = useCalendarEvents(ymd(weekStart), ymd(weekEnd), true)
  const confirm = useConfirmEvent()
  const dismiss = useDismissEvent()

  // The mini-month rail shows THREE months at once (previous / current / next).
  // `monthCursor` is the MIDDLE month; up/down arrows slide the window by one.
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const shiftMonth = (delta: number): void =>
    setMonthCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  const visibleMonths = [-1, 0, 1].map((off) => {
    const d = new Date(monthCursor.year, monthCursor.month + off, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const spanStart = `${visibleMonths[0]!.year}-${String(visibleMonths[0]!.month + 1).padStart(2, '0')}-01`
  const spanEnd = ymd(new Date(visibleMonths[2]!.year, visibleMonths[2]!.month + 1, 0))
  const monthEvents = useCalendarEvents(spanStart, spanEnd, true)
  const daySet = useMemo(
    () => new Set((monthEvents.data ?? []).map((e) => ymd(new Date(e.start)))),
    [monthEvents.data],
  )

  const days = useMemo(() => {
    const buckets = new Map<string, CalendarEvent[]>()
    for (let i = 0; i < 7; i++) buckets.set(ymd(new Date(weekStart.getTime() + i * DAY_MS)), [])
    for (const e of events.data ?? []) {
      const key = ymd(new Date(e.start))
      buckets.get(key)?.push(e)
    }
    for (const list of buckets.values()) list.sort((a, b) => +new Date(a.start) - +new Date(b.start))
    return [...buckets.entries()]
  }, [events.data, weekStart])

  const todayKey = ymd(new Date())
  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Your week — synced feeds, email events & your own blocks"
        action={
          <div className="cal-actions">
            <button className="btn ghost sm" onClick={() => setWeekStart(weekStartOf(new Date()))}>
              Today
            </button>
            <button className="icon-btn" title="Previous week" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY_MS))}>
              <ChevronLeft size={16} />
            </button>
            <span className="muted small cal-range">{rangeLabel}</span>
            <button className="icon-btn" title="Next week" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY_MS))}>
              <ChevronRight size={16} />
            </button>
            <button className="btn primary sm" onClick={() => setCreating(new Date(weekStart))}>
              <Plus size={14} /> New event
            </button>
          </div>
        }
      />

      {events.isError && <p className="error">{(events.error as Error).message}</p>}

      <div className="cal-layout">
        <div className="cal-main">
          {events.isPending && <p className="muted">Loading…</p>}
          <div className="cal-week">
            {days.map(([key, list]) => {
              const d = new Date(`${key}T00:00:00`)
              return (
                <section key={key} className={`card cal-day${key === todayKey ? ' today' : ''}`}>
                  <div className="cal-day-head">
                    <h3>{dayLabel(d)}</h3>
                    {key === todayKey && <span className="cal-today-pill">Today</span>}
                  </div>
                  {list.length === 0 ? (
                    <p className="muted small cal-empty">—</p>
                  ) : (
                    <div className="cal-events">
                      {list.map((e) => (
                        <EventRow
                          key={e.id}
                          event={e}
                          onEdit={() => e.source === 'local' && setEditing(e)}
                          onConfirm={() => confirm.mutate(e.id)}
                          onDismiss={() => dismiss.mutate(e.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </div>

        <aside className="cal-side">
          <div className="cal-side-nav">
            <span className="cal-side-nav-label">Months</span>
            <div className="cal-side-nav-btns">
              <button type="button" className="icon-btn" title="Earlier months" onClick={() => shiftMonth(-1)}>
                <ChevronUp size={16} />
              </button>
              <button type="button" className="icon-btn" title="Later months" onClick={() => shiftMonth(1)}>
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
          {visibleMonths.map((m) => (
            <MiniMonth
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              todayKey={todayKey}
              weekStart={weekStart}
              weekEnd={weekEnd}
              daySet={daySet}
              onPick={(d) => setWeekStart(weekStartOf(d))}
            />
          ))}
        </aside>
      </div>

      {creating && <EventModal initialDay={creating} onClose={() => setCreating(null)} />}
      {editing && <EventModal event={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] // Monday-first

/** A compact month grid for the side rail: today + selected week highlighted,
 * days with events dotted; clicking a day jumps the week view to that week. */
function MiniMonth({
  year,
  month,
  todayKey,
  weekStart,
  weekEnd,
  daySet,
  onPick,
}: {
  year: number
  month: number
  todayKey: string
  weekStart: Date
  weekEnd: Date
  daySet: Set<string>
  onPick: (d: Date) => void
}) {
  const monthStart = new Date(year, month, 1)
  const lebefore = (monthStart.getDay() + 6) % 7 // Monday-first blanks
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: lebefore }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]
  const label = monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const wsTime = new Date(weekStart).setHours(0, 0, 0, 0)
  const weTime = new Date(weekEnd).setHours(23, 59, 59, 999)

  return (
    <div className="mini-month">
      <div className="mini-month-title">{label}</div>
      <div className="mini-grid">
        {WEEKDAY_INITIALS.map((w, i) => (
          <span key={i} className="mini-dow">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} className="mini-cell empty" />
          const key = ymd(d)
          const inWeek = d.getTime() >= wsTime && d.getTime() <= weTime
          const classes = [
            'mini-cell',
            key === todayKey ? 'today' : '',
            inWeek ? 'in-week' : '',
            daySet.has(key) ? 'has-event' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button key={key} type="button" className={classes} onClick={() => onPick(d)}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EventRow({
  event,
  onEdit,
  onConfirm,
  onDismiss,
}: {
  event: CalendarEvent
  onEdit: () => void
  onConfirm: () => void
  onDismiss: () => void
}) {
  const suggested = event.status === 'suggested'
  const timeFmt = useTimeFormat()
  return (
    <div className={`cal-event src-${event.source}${suggested ? ' suggested' : ''}`}>
      <button type="button" className="cal-event-main" onClick={onEdit} disabled={event.source !== 'local'}>
        <span className="cal-event-time">
          <Clock size={11} /> {eventTime(event, timeFmt)}
        </span>
        <span className="cal-event-title">{event.title}</span>
        {event.location && (
          <span className="cal-event-loc muted small">
            <MapPin size={11} /> {event.location}
          </span>
        )}
        <span className="cal-event-src">{SOURCE_LABEL[event.source] ?? event.source}</span>
      </button>
      {suggested && (
        <div className="cal-event-suggest">
          <button className="icon-btn" title="Add to calendar" onClick={onConfirm}>
            <Check size={14} />
          </button>
          <button className="icon-btn" title="Dismiss" onClick={onDismiss}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/** Local-time value for a datetime-local input. */
function toLocalInput(iso?: string, fallback?: Date): string {
  const d = iso ? new Date(iso) : (fallback ?? new Date())
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

function EventModal({
  event,
  initialDay,
  onClose,
}: {
  event?: CalendarEvent
  initialDay?: Date
  onClose: () => void
}) {
  const create = useCreateLocalEvent()
  const update = useUpdateLocalEvent()
  const del = useDeleteLocalEvent()
  const toast = useToast()
  const isEdit = !!event

  const defaultStart = initialDay ? new Date(initialDay.setHours(9, 0, 0, 0)) : new Date()
  const [title, setTitle] = useState(event?.title ?? '')
  const [start, setStart] = useState(toLocalInput(event?.start, defaultStart))
  const [end, setEnd] = useState(event?.end ? toLocalInput(event.end) : '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [location, setLocation] = useState(event?.location ?? '')
  const [description, setDescription] = useState(event?.description ?? '')

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    const body: LocalEventInput = {
      title: title.trim(),
      start,
      end: end || undefined,
      allDay,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    }
    if (!body.title) return
    const onDone = { onSuccess: () => { toast.show(isEdit ? 'Event updated' : 'Event added'); onClose() }, onError: (err: unknown) => toast.show((err as Error).message, 'error') }
    if (isEdit && event) update.mutate({ id: event.id, body }, onDone)
    else create.mutate(body, onDone)
  }

  const remove = (): void => {
    if (!event) return
    del.mutate(event.id, { onSuccess: () => { toast.show('Event deleted'); onClose() } })
  }

  return (
    <Modal title={isEdit ? 'Edit event' : 'New event'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Deep work block" />
        </label>
        <label className="field cal-allday">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day
        </label>
        <div className="cal-form-row">
          <label className="field">
            <span>Start</span>
            <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>End</span>
            <input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Location</span>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </label>
        <div className="form-actions cal-modal-actions">
          {isEdit && (
            <button type="button" className="btn ghost danger" onClick={remove}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!title.trim() || create.isPending || update.isPending}>
            {isEdit ? 'Save' : 'Add event'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
