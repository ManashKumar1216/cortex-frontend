import { useState } from 'react'

import { RefreshCw, Sparkles } from 'lucide-react'

import { useAnalytics, useAnalyticsVerdict, useRefreshVerdict } from '../api/analytics'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { Markdown } from '../components/Markdown'
import { MoodChart } from '../components/MoodChart'
import { PageHeader } from '../components/ui'
import { formatMoney } from '../lib/format'
import type { AnalyticsData } from '../lib/types'

const RANGES: { days: number; label: string }[] = [
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 365, label: '1y' },
]

const QUAD_META: { key: keyof AnalyticsData['quadrants']; label: string; color: string }[] = [
  { key: 'Q1', label: 'Do (urgent + important)', color: 'var(--danger)' },
  { key: 'Q2', label: 'Plan (important)', color: 'var(--success)' },
  { key: 'Q3', label: 'Delegate (urgent)', color: 'var(--warning)' },
  { key: 'Q4', label: 'Eliminate (neither)', color: 'var(--muted)' },
]

export function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const analytics = useAnalytics(days)
  const verdict = useAnalyticsVerdict()
  const refresh = useRefreshVerdict()
  const a = analytics.data

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="The numbers across your second brain"
        action={
          <div className="filter-row">
            {RANGES.map((r) => (
              <button key={r.days} className={`chip${days === r.days ? ' active' : ''}`} onClick={() => setDays(r.days)}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {/* AI verdict */}
      <section className="card analytics-verdict">
        <div className="row-between">
          <span className="agent-title">
            <Sparkles size={16} /> Verdict
          </span>
          <button className="btn ghost sm" onClick={() => refresh.mutate(days)} disabled={refresh.isPending}>
            <RefreshCw size={14} className={refresh.isPending ? 'spin' : undefined} />{' '}
            {verdict.data ? 'Refresh' : 'Generate analysis'}
          </button>
        </div>
        {refresh.isPending ? (
          <p className="muted">Reading your numbers…</p>
        ) : verdict.data ? (
          <Markdown source={verdict.data.body} />
        ) : (
          <p className="muted small">Generate an AI read on what your numbers say over this period.</p>
        )}
      </section>

      {analytics.isPending && <p className="muted">Crunching…</p>}

      {a && (
        <>
          {/* Tiles */}
          <div className="stat-row analytics-tiles">
            <Tile value={a.tiles.tasksCompleted} label={`Tasks done · ${days}d`} />
            <Tile value={`${Math.round(a.tiles.completionRate * 100)}%`} label="Completion" />
            <Tile value={a.tiles.openTasks} label="Open tasks" />
            <Tile value={a.tiles.habitLogs} label="Habit check-ins" />
            <Tile value={a.tiles.journalEntries} label={`Journal · ${a.tiles.journalingDays}d`} />
            <Tile value={a.tiles.avgMood != null ? `${a.tiles.avgMood}` : '—'} label="Avg mood" />
            <Tile value={a.tiles.captures} label="Captures" />
            {a.tiles.spend != null && a.spend && (
              <Tile value={formatMoney(a.tiles.spend, a.spend.currency.code)} label="Spent" />
            )}
            <Tile value={a.tiles.activeProjects} label="Projects" />
            <Tile value={a.tiles.activeGoals} label="Goals" />
          </div>

          {/* Activity heatmap */}
          <section className="card analytics-section">
            <h2>Activity</h2>
            <ActivityHeatmap days={a.heatmap.days} max={a.heatmap.max} />
          </section>

          <div className="analytics-grid">
            {/* Throughput */}
            <section className="card analytics-section">
              <h2>Task throughput</h2>
              {a.throughput.length === 0 ? (
                <p className="muted small">No task activity in this window.</p>
              ) : (
                <Bars
                  items={a.throughput.map((w) => ({
                    label: `wk ${w.week.slice(5)}`,
                    value: w.completed,
                    sub: `${w.completed} done · ${w.created} new`,
                  }))}
                />
              )}
            </section>

            {/* Attention by area */}
            <section className="card analytics-section">
              <h2>Where attention went</h2>
              {a.byArea.filter((x) => x.count > 0).length === 0 ? (
                <p className="muted small">No filed activity yet.</p>
              ) : (
                <Bars
                  items={a.byArea
                    .filter((x) => x.count > 0)
                    .slice(0, 8)
                    .map((x) => ({ label: x.name, value: x.count, color: x.color, sub: `${x.pct}%` }))}
                />
              )}
            </section>

            {/* Eisenhower mix */}
            <section className="card analytics-section">
              <h2>Open tasks by quadrant</h2>
              <Bars items={QUAD_META.map((q) => ({ label: q.label, value: a.quadrants[q.key], color: q.color }))} />
            </section>

            {/* Mood */}
            <section className="card analytics-section">
              <div className="row-between">
                <h2>Mood</h2>
                {a.mood.avg != null && <span className="muted small">avg {a.mood.avg}/5 · {a.mood.trend}</span>}
              </div>
              <MoodChart points={a.mood.points} />
            </section>

            {/* Habits */}
            <section className="card analytics-section">
              <h2>Habit consistency</h2>
              {a.habits.length === 0 ? (
                <p className="muted small">No active habits.</p>
              ) : (
                <div className="habit-rows">
                  {a.habits.map((h) => (
                    <div key={h.id} className="habit-row">
                      <span className="dot" style={{ background: h.color }} />
                      <span className="habit-name">{h.name}</span>
                      <span className="habit-strip">
                        {h.last14.map((on, i) => (
                          <span key={i} className={`habit-cell${on ? ' on' : ''}`} />
                        ))}
                      </span>
                      <span className="muted small mono">🔥{h.currentStreak}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Spend */}
            {a.spend && a.spend.byArea.length > 0 && (
              <section className="card analytics-section">
                <h2>Spending by area</h2>
                <Bars
                  items={a.spend.byArea.slice(0, 8).map((s) => ({
                    label: s.name,
                    value: s.amount,
                    color: s.color,
                    sub: formatMoney(s.amount, a.spend!.currency.code),
                  }))}
                />
              </section>
            )}

            {/* Usage */}
            <section className="card analytics-section">
              <h2>Capture &amp; chat usage</h2>
              <div className="stat-row">
                <Tile value={a.usage.capturesByKind.text} label="Typed" />
                <Tile value={a.usage.capturesByKind.voice} label="Voice" />
                <Tile value={a.usage.capturesByKind.photo} label="Photo" />
                <Tile value={a.usage.chatTotal} label="Chat msgs" />
              </div>
            </section>

            {/* Going quiet */}
            {(a.goingQuiet.areas.length > 0 || a.goingQuiet.projects.length > 0) && (
              <section className="card analytics-section">
                <h2>Going quiet</h2>
                {a.goingQuiet.areas.length > 0 && (
                  <p className="small">
                    <span className="muted">Areas:</span> {a.goingQuiet.areas.map((x) => x.name).join(', ')}
                  </p>
                )}
                {a.goingQuiet.projects.length > 0 && (
                  <div className="quiet-projects">
                    <span className="muted small">Stagnant projects</span>
                    {a.goingQuiet.projects.map((p, i) => (
                      <div key={i} className="quiet-project small">
                        {p.title} <span className="muted">· weight {p.weight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value mono">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

interface BarItem {
  label: string
  value: number
  color?: string
  sub?: string
}

function Bars({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="abars">
      {items.map((it, i) => (
        <div key={i} className="abar-row">
          <span className="abar-label">{it.label}</span>
          <span className="abar-track">
            <span
              className="abar-fill"
              style={{ width: `${Math.round((it.value / max) * 100)}%`, background: it.color ?? 'var(--accent)' }}
            />
          </span>
          <span className="abar-val mono">{it.sub ?? it.value}</span>
        </div>
      ))}
    </div>
  )
}
