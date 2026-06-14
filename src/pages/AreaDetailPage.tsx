import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bot, ChevronRight, Play, Power, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAgent, useAgentActions } from '../api/agents'
import { api } from '../api/client'
import { PageHeader } from '../components/ui'
import { formatDate } from '../lib/format'
import type { AreaDetail, AgentScoreLabel, LifeAgent } from '../lib/types'

const COUNT_LABELS: { key: string; label: string }[] = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'projects', label: 'Projects' },
  { key: 'goals', label: 'Goals' },
  { key: 'habits', label: 'Habits' },
  { key: 'journal', label: 'Journal' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'notes', label: 'Notes' },
]

const LABEL_CLS: Record<AgentScoreLabel, string> = {
  thriving: 'ok',
  steady: 'info',
  'at risk': 'bad',
  new: 'muted',
}

export function AreaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['areas', 'detail', id],
    queryFn: () => api.get<AreaDetail>(`/areas/${id}`),
    enabled: !!id,
  })

  if (isPending) return <p className="muted">Loading…</p>
  if (isError) return <p className="error">{(error as Error).message}</p>

  const { area, isLane, subAreas, counts } = data
  const total = COUNT_LABELS.reduce((n, c) => n + (counts[c.key] ?? 0), 0)

  return (
    <div>
      <button className="btn ghost sm area-back" onClick={() => navigate('/areas')}>
        <ArrowLeft size={14} /> Areas
      </button>
      <PageHeader
        title={`${area.code ?? ''} ${area.name}`.trim()}
        subtitle={isLane ? area.description || 'A top-level lane' : area.description || 'A sub-area'}
      />

      <div className="wa-stats">
        {COUNT_LABELS.map((c) => (
          <div key={c.key} className="wa-stat">
            <span className="wa-stat-value mono">{counts[c.key] ?? 0}</span>
            <span className="wa-stat-label">{c.label}</span>
          </div>
        ))}
      </div>
      <p className="muted area-rollup-note">
        {isLane
          ? `${total} item(s) filed under this lane and its ${subAreas.length} sub-area(s).`
          : `${total} item(s) filed under this sub-area.`}
      </p>

      {/* Life Agent (Phase 13) — lanes only */}
      {isLane ? (
        <AgentPanel areaId={area.id} areaName={area.name} />
      ) : (
        <p className="muted agent-subnote">
          <Bot size={13} /> Life Agents run at the lane level — open this area's parent lane to configure its coach.
        </p>
      )}

      {isLane && subAreas.length > 0 && (
        <>
          <h3 className="area-subhead">Sub-areas</h3>
          <div className="area-tree">
            {subAreas.map((s) => (
              <div key={s.id} className="area-row sub">
                <span className="dot" style={{ background: s.color }} />
                <span className="area-code mono">{s.code}</span>
                <button className="area-name" onClick={() => navigate(`/areas/${s.id}`)}>
                  {s.name} <ChevronRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AgentPanel({ areaId, areaName }: { areaId: string; areaName: string }) {
  const { data: agent, isPending } = useAgent(areaId)
  const actions = useAgentActions(areaId)
  const enabled = agent?.enabled ?? false
  const busy = actions.update.isPending || actions.run.isPending || actions.clearMemory.isPending

  if (isPending) return <section className="card agent-card"><p className="muted">Loading agent…</p></section>

  if (!enabled) {
    return (
      <section className="card agent-card agent-off">
        <div className="agent-head">
          <span className="agent-title">
            <Bot size={16} /> Life Agent
          </span>
        </div>
        <p className="muted small">
          A calm coach for <strong>{areaName}</strong> — it watches this area, keeps a memory across runs, scores its
          health, and surfaces a gentle nudge (and an alert when a pattern needs attention). It only advises; it never
          changes your data.
        </p>
        <button className="btn primary sm" onClick={() => actions.update.mutate({ enabled: true })} disabled={busy}>
          <Power size={14} /> Enable agent
        </button>
      </section>
    )
  }

  return <ActiveAgent agent={agent as LifeAgent} areaName={areaName} actions={actions} busy={busy} />
}

function ActiveAgent({
  agent,
  areaName,
  actions,
  busy,
}: {
  agent: LifeAgent
  areaName: string
  actions: ReturnType<typeof useAgentActions>
  busy: boolean
}) {
  const [focus, setFocus] = useState(agent.focus ?? '')
  const [showMemory, setShowMemory] = useState(false)
  const ran = !!agent.lastRunAt

  return (
    <section className="card agent-card">
      <div className="agent-head">
        <span className="agent-title">
          <Bot size={16} /> {areaName} agent
        </span>
        <div className="agent-head-actions">
          <button className="btn primary sm" onClick={() => actions.run.mutate()} disabled={busy}>
            <Play size={14} /> {actions.run.isPending ? 'Thinking…' : 'Run now'}
          </button>
          <button
            className="btn ghost sm"
            onClick={() => actions.update.mutate({ enabled: false })}
            disabled={busy}
            title="Disable this agent"
          >
            <Power size={14} /> Disable
          </button>
        </div>
      </div>

      {ran ? (
        <>
          <div className="agent-score-row">
            <div className="agent-score">
              <span className="agent-score-num mono">{agent.score}</span>
              <span className="agent-score-max">/100</span>
            </div>
            <span className={`badge ${LABEL_CLS[agent.scoreLabel]}`}>{agent.scoreLabel}</span>
            <span className="muted small">{agent.lastRunAt ? `updated ${formatDate(agent.lastRunAt)}` : ''}</span>
          </div>

          {agent.coaching && <p className="agent-coaching">{agent.coaching}</p>}
          {agent.alert && (
            <p className="agent-alert">
              <strong>Alert:</strong> {agent.alert}
            </p>
          )}
        </>
      ) : (
        <p className="muted small">Agent enabled. Run it now to get your first read on {areaName}.</p>
      )}

      <div className="agent-focus">
        <input
          className="input"
          placeholder="Optional focus (e.g. consistency over intensity)"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        />
        <button
          className="btn ghost sm"
          onClick={() => actions.update.mutate({ focus })}
          disabled={busy || focus === (agent.focus ?? '')}
        >
          Save focus
        </button>
      </div>

      <div className="agent-memory">
        <button className="agent-memory-toggle" onClick={() => setShowMemory((s) => !s)}>
          Memory ({agent.memory.length}) {showMemory ? '▾' : '▸'}
        </button>
        {showMemory && (
          <>
            {agent.memory.length === 0 ? (
              <p className="muted small">Nothing remembered yet — the agent builds this up over runs.</p>
            ) : (
              <ul className="agent-memory-list">
                {agent.memory.map((m, i) => (
                  <li key={i}>
                    <span className="muted mono small">{formatDate(m.at)}</span> {m.note}
                  </li>
                ))}
              </ul>
            )}
            {agent.memory.length > 0 && (
              <button className="btn ghost sm" onClick={() => actions.clearMemory.mutate()} disabled={busy}>
                <Trash2 size={13} /> Clear memory
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
