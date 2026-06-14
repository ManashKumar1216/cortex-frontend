import { Check, Circle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROADMAP } from '../../lib/marketing-content'
import { usePageTitle } from '../../lib/usePageTitle'

const STATUS_BADGE: Record<string, { text: string; kind: string }> = {
  done: { text: 'Shipped', kind: 'ok' },
  now: { text: 'In progress', kind: 'warn' },
  planned: { text: 'Planned', kind: 'muted' },
}

export function RoadmapPage() {
  usePageTitle('Roadmap — Cortex')
  return (
    <>
      <section className="mkt-hero" style={{ gridTemplateColumns: '1fr', paddingBottom: 'var(--sp-8)' }}>
        <div>
          <p className="mkt-eyebrow">Roadmap</p>
          <h1 style={{ maxWidth: '20ch' }}>Built local-first. Expanding, honestly.</h1>
          <p className="mkt-hero-sub">
            Foundations, memory, the agent, proactive nudges, integrations, the intelligence layer,
            budgeting, and calendar are all shipped. Ambient capture and the news digest are the
            current frontier — and everything ahead keeps your data yours by default.
          </p>
        </div>
      </section>

      <section className="mkt-section">
        <ol className="timeline">
          {ROADMAP.map((phase) => {
            const badge = STATUS_BADGE[phase.status] ?? STATUS_BADGE.planned
            return (
              <li key={phase.title} className={`tl-item ${phase.status}`}>
                <span className="tl-node" aria-hidden="true">
                  {phase.status === 'done' ? (
                    <Check size={15} strokeWidth={2.6} />
                  ) : phase.status === 'now' ? (
                    <Circle size={10} strokeWidth={3} fill="currentColor" />
                  ) : null}
                </span>
                <article className="tl-card">
                  <div className="roadmap-head">
                    <span className="roadmap-label">{phase.label}</span>
                    <h3>{phase.title}</h3>
                    {badge && <span className={`badge ${badge.kind}`}>{badge.text}</span>}
                  </div>
                  <ul>
                    {phase.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </li>
            )
          })}
        </ol>
        <p className="mkt-footnote">
          Roadmap reflects current direction, not a commitment to dates. Cortex ships local-first and
          stays that way; cloud options, if added, remain your choice.
        </p>
      </section>

      <section className="mkt-section">
        <div className="mkt-cta">
          <span className="empty-orbit">🧠</span>
          <h2>Start with what’s already here.</h2>
          <p>The shipped core is a complete second brain. Everything else is upside.</p>
          <div className="mkt-actions">
            <Link to="/login" className="btn primary mkt-btn-lg">
              Get started
            </Link>
            <Link to="/guide" className="btn ghost mkt-btn-lg">
              Read the guide
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
