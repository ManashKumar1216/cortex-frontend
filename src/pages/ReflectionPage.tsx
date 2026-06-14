import { useState } from 'react'

import {
  CalendarPlus,
  Check,
  CheckSquare,
  Lightbulb,
  Minus,
  PenLine,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { areas, journal } from '../api/hooks'
import {
  useDailyPrompt,
  useInsightActions,
  useInsights,
  useJournalSuggestionActions,
  useJournalSuggestions,
  useMoodStats,
  useRefreshInsights,
} from '../api/reflection'
import { MoodChart } from '../components/MoodChart'
import { EmptyState, PageHeader } from '../components/ui'
import { MOOD_EMOJI, formatDay } from '../lib/format'
import type { Area, Insight, InsightCategory, JournalSuggestion, MoodStats } from '../lib/types'

const INSIGHT_CAT: Record<InsightCategory, { label: string; cls: string }> = {
  correlation: { label: 'pattern', cls: 'info' },
  neglect: { label: 'attention', cls: 'warn' },
  trend: { label: 'trend', cls: 'info' },
  spending: { label: 'spending', cls: 'warn' },
  consistency: { label: 'momentum', cls: 'ok' },
}

const TREND_META: Record<MoodStats['trend'], { label: string; cls: string }> = {
  up: { label: 'rising', cls: 'ok' },
  down: { label: 'dipping', cls: 'bad' },
  flat: { label: 'steady', cls: 'muted' },
  none: { label: '', cls: 'muted' },
}

export function ReflectionPage() {
  const [days, setDays] = useState(30)
  const mood = useMoodStats(days)
  const prompt = useDailyPrompt()
  const suggestions = useJournalSuggestions()
  const insights = useInsights()
  const refreshInsights = useRefreshInsights()
  const recent = journal.useList()
  const areaList = areas.useList()
  const navigate = useNavigate()

  const stats = mood.data
  const reflected = (recent.data ?? []).filter((e) => e.aiSummary).slice(0, 8)
  const areaById = new Map((areaList.data ?? []).map((a) => [a.id, a]))

  return (
    <div>
      <PageHeader title="Reflection" subtitle="Your mood, prompts, and what journaling surfaced" />

      {/* Today's prompt */}
      <section className="card prompt-card">
        <div className="prompt-head">
          <Sparkles size={16} /> Today's prompt
        </div>
        <p className="prompt-text">{prompt.isPending ? 'Thinking of a good question…' : prompt.data?.text}</p>
        <button className="btn primary sm" onClick={() => navigate('/journal')}>
          <PenLine size={14} /> Write about this
        </button>
      </section>

      {/* Insights — cross-domain patterns the engine found */}
      <section className="reflect-section">
        <div className="row-between">
          <h2>
            <Lightbulb size={16} className="inline-ico" /> Insights
          </h2>
          <button
            className="btn ghost sm"
            onClick={() => refreshInsights.mutate()}
            disabled={refreshInsights.isPending}
          >
            <RefreshCw size={14} className={refreshInsights.isPending ? 'spin' : undefined} /> Refresh
          </button>
        </div>
        {(insights.isPending || refreshInsights.isPending) && <p className="muted">Looking for patterns…</p>}
        {insights.data && insights.data.length === 0 && !refreshInsights.isPending && (
          <p className="muted small">
            No patterns yet. As you log tasks, habits, journaling and spending, Cortex surfaces
            cross-domain insights here for you to keep or dismiss.
          </p>
        )}
        <div className="insight-grid">
          {insights.data?.map((i) => (
            <InsightCard key={i.id} insight={i} area={i.areaId ? areaById.get(i.areaId) : undefined} />
          ))}
        </div>
      </section>

      {/* Mood trend */}
      <section className="card reflect-mood">
        <div className="row-between">
          <h2>Mood trend</h2>
          <div className="filter-row">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                className={`chip${days === d ? ' active' : ''}`}
                onClick={() => setDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {mood.isPending && <p className="muted">Loading…</p>}
        {stats && (
          <>
            <MoodChart points={stats.points} />
            <div className="reflect-mood-meta">
              <span className="muted small">
                7-day avg{' '}
                <strong>{stats.avg7 != null ? `${stats.avg7}/5` : '—'}</strong>
              </span>
              <span className="muted small">
                {days}-day avg{' '}
                <strong>{stats.avgWindow != null ? `${stats.avgWindow}/5` : '—'}</strong>
              </span>
              {stats.trend !== 'none' && (
                <span className={`badge ${TREND_META[stats.trend].cls}`}>
                  {stats.trend === 'up' ? (
                    <TrendingUp size={12} />
                  ) : stats.trend === 'down' ? (
                    <TrendingDown size={12} />
                  ) : (
                    <Minus size={12} />
                  )}{' '}
                  {TREND_META[stats.trend].label}
                </span>
              )}
              <span className="muted small">{stats.totalEntries} entries</span>
            </div>
            {stats.topThemes.length > 0 && (
              <div className="theme-row">
                {stats.topThemes.map((t) => (
                  <span key={t.theme} className="theme-chip">
                    {t.theme} <span className="muted">{t.count}</span>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Follow-ups Cortex spotted */}
      <section className="reflect-section">
        <h2>Follow-ups from your journal</h2>
        {suggestions.isPending && <p className="muted">Loading…</p>}
        {suggestions.data && suggestions.data.length === 0 && (
          <p className="muted small">
            Nothing waiting. As you journal, Cortex surfaces concrete follow-ups here to add or dismiss.
          </p>
        )}
        <div className="list">
          {suggestions.data?.map((s) => <SuggestionCard key={s.id} suggestion={s} />)}
        </div>
      </section>

      {/* Recent AI reflections */}
      <section className="reflect-section">
        <h2>Recent reflections</h2>
        {reflected.length === 0 ? (
          <EmptyState
            message="No reflections yet."
            hint="Write a journal entry — Cortex distills a summary, themes, and mood for each one."
          />
        ) : (
          <div className="list">
            {reflected.map((e) => (
              <div key={e.id} className="card reflect-entry">
                <div className="row">
                  <strong>{formatDay(e.date)}</strong>
                  {e.mood != null && <span>{MOOD_EMOJI[e.mood]}</span>}
                  {e.moodSource === 'ai' && <span className="badge muted">AI mood</span>}
                  {e.title && <span className="muted">— {e.title}</span>}
                </div>
                <p className="reflect-summary">{e.aiSummary}</p>
                {e.themes && e.themes.length > 0 && (
                  <div className="theme-row">
                    {e.themes.map((t) => (
                      <span key={t} className="theme-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function InsightCard({ insight, area }: { insight: Insight; area?: Area }) {
  const actions = useInsightActions()
  const cat = INSIGHT_CAT[insight.category] ?? { label: insight.category, cls: 'muted' }
  const kept = insight.status === 'kept'
  const busy = actions.keep.isPending || actions.dismiss.isPending
  return (
    <div className={`card insight-card${kept ? ' kept' : ''}`}>
      <div className="insight-head">
        <span className={`badge ${cat.cls}`}>{cat.label}</span>
        {area && (
          <span className="insight-area">
            <span className="dot" style={{ background: area.color }} /> {area.name}
          </span>
        )}
        {kept && (
          <span className="badge ok insight-kept">
            <Check size={11} /> kept
          </span>
        )}
      </div>
      <p className="insight-title">{insight.title}</p>
      {insight.detail && <p className="insight-detail muted small">{insight.detail}</p>}
      <div className="insight-foot">
        {!kept && (
          <button className="btn primary sm" onClick={() => actions.keep.mutate(insight.id)} disabled={busy}>
            <Check size={14} /> Keep
          </button>
        )}
        <button className="btn ghost sm" onClick={() => actions.dismiss.mutate(insight.id)} disabled={busy}>
          <X size={14} /> Dismiss
        </button>
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: JournalSuggestion }) {
  const actions = useJournalSuggestionActions()
  const isReminder = suggestion.type === 'reminder'
  const busy = actions.add.isPending || actions.dismiss.isPending
  return (
    <div className="card wa-suggestion">
      <div className="wa-suggestion-head">
        <span className={`badge ${isReminder ? 'info' : 'muted'}`}>{isReminder ? 'reminder' : 'to-do'}</span>
        <strong>{suggestion.title}</strong>
      </div>
      <p className="muted wa-suggestion-meta">
        From your journal{suggestion.entryDate ? ` · ${formatDay(suggestion.entryDate)}` : ''}
      </p>
      <div className="wa-suggestion-foot">
        <button className="btn primary sm" onClick={() => actions.add.mutate(suggestion.id)} disabled={busy}>
          {isReminder ? <CalendarPlus size={14} /> : <CheckSquare size={14} />}{' '}
          {isReminder ? 'Add reminder' : 'Add task'}
        </button>
        <button className="btn ghost sm" onClick={() => actions.dismiss.mutate(suggestion.id)} disabled={busy}>
          <X size={14} /> Dismiss
        </button>
      </div>
    </div>
  )
}
