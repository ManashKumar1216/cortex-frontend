import { useState } from 'react'

import {
  BarChart3,
  BookOpen,
  CheckSquare,
  Flame,
  FolderKanban,
  Inbox,
  RefreshCw,
  Smile,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react'

import { useAnalytics, useAnalyticsVerdict, useRefreshVerdict } from '../api/analytics'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { Markdown } from '../components/Markdown'
import { MoodChart } from '../components/MoodChart'
import { Button, Card, Chip, PageHeader, SkeletonText, Stat } from '../components/ui'
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
          <div className="filter-row" style={{ marginBottom: 0 }}>
            {RANGES.map((r) => (
              <Chip key={r.days} active={days === r.days} onClick={() => setDays(r.days)}>
                {r.label}
              </Chip>
            ))}
          </div>
        }
      />

      {/* AI verdict — verdict-first */}
      <Card
        variant="intelligence"
        hero
        className="analytics-verdict"
        eyebrow="Verdict"
        eyebrowIcon={<Sparkles size={15} />}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh.mutate(days)}
            loading={refresh.isPending}
            icon={<RefreshCw size={14} />}
          >
            {verdict.data ? 'Refresh' : 'Generate'}
          </Button>
        }
      >
        {refresh.isPending ? (
          <SkeletonText lines={3} />
        ) : verdict.data ? (
          <Markdown source={verdict.data.body} />
        ) : (
          <p className="briefing-prompt">
            Generate an AI read on what your numbers say over this period — what's working, what's
            drifting, and the one thing to change.
          </p>
        )}
      </Card>

      {analytics.isPending && <SkeletonText lines={4} />}

      {a && (
        <>
          {/* Headline metrics */}
          <div className="summary-band">
            <Stat size="lg" icon={<CheckSquare size={15} />} value={a.tiles.tasksCompleted} label={`Tasks done · ${days}d`} />
            <Stat size="lg" icon={<Target size={15} />} value={`${Math.round(a.tiles.completionRate * 100)}%`} label="Completion" />
            <Stat size="lg" icon={<BarChart3 size={15} />} value={a.tiles.openTasks} label="Open tasks" />
            {a.tiles.spend != null && a.spend && (
              <Stat size="lg" icon={<Wallet size={15} />} value={formatMoney(a.tiles.spend, a.spend.currency.code)} label="Spent" />
            )}
            <Stat size="lg" icon={<Smile size={15} />} value={a.tiles.avgMood != null ? `${a.tiles.avgMood}` : '—'} label="Avg mood" />
          </div>

          {/* Secondary metrics */}
          <div className="summary-band">
            <Stat size="sm" icon={<Flame size={14} />} value={a.tiles.habitLogs} label="Habit check-ins" />
            <Stat size="sm" icon={<BookOpen size={14} />} value={a.tiles.journalEntries} label={`Journal · ${a.tiles.journalingDays}d`} />
            <Stat size="sm" icon={<Inbox size={14} />} value={a.tiles.captures} label="Captures" />
            <Stat size="sm" icon={<FolderKanban size={14} />} value={a.tiles.activeProjects} label="Projects" />
            <Stat size="sm" icon={<Target size={14} />} value={a.tiles.activeGoals} label="Goals" />
          </div>

          <Card eyebrow="Activity" className="analytics-section">
            <ActivityHeatmap days={a.heatmap.days} max={a.heatmap.max} />
          </Card>

          <div className="analytics-grid">
            <Card eyebrow="Task throughput" className="analytics-section">
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
            </Card>

            <Card eyebrow="Where attention went" className="analytics-section">
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
            </Card>

            <Card eyebrow="Open tasks by quadrant" className="analytics-section">
              <Bars items={QUAD_META.map((q) => ({ label: q.label, value: a.quadrants[q.key], color: q.color }))} />
            </Card>

            <Card
              eyebrow="Mood"
              className="analytics-section"
              actions={a.mood.avg != null ? <span className="muted small">avg {a.mood.avg}/5 · {a.mood.trend}</span> : undefined}
            >
              <MoodChart points={a.mood.points} />
            </Card>

            <Card eyebrow="Habit consistency" className="analytics-section">
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
                      <span className="muted small streak mono">
                        <Flame size={12} />
                        {h.currentStreak}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {a.spend && a.spend.byArea.length > 0 && (
              <Card eyebrow="Spending by area" className="analytics-section">
                <Bars
                  items={a.spend.byArea.slice(0, 8).map((s) => ({
                    label: s.name,
                    value: s.amount,
                    color: s.color,
                    sub: formatMoney(s.amount, a.spend!.currency.code),
                  }))}
                />
              </Card>
            )}

            <Card eyebrow="Capture & chat usage" className="analytics-section">
              <div className="summary-band">
                <Stat size="sm" value={a.usage.capturesByKind.text} label="Typed" />
                <Stat size="sm" value={a.usage.capturesByKind.voice} label="Voice" />
                <Stat size="sm" value={a.usage.capturesByKind.photo} label="Photo" />
                <Stat size="sm" value={a.usage.chatTotal} label="Chat msgs" />
              </div>
            </Card>

            {(a.goingQuiet.areas.length > 0 || a.goingQuiet.projects.length > 0) && (
              <Card eyebrow="Going quiet" className="analytics-section">
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
              </Card>
            )}
          </div>
        </>
      )}
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
