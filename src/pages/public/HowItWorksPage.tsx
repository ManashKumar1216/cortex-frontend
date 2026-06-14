import { Bell, Brain, Cpu, Database, Lightbulb, Radio, Search, ShieldCheck, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'

import { usePageTitle } from '../../lib/usePageTitle'

const LOOP = [
  'You ask in plain language.',
  'Cortex runs read tools (search_memory, list_tasks) on its own to ground itself.',
  'On the first write it needs, it pauses with a before/after preview.',
  'You Approve, Edit, or Cancel — then it continues, up to a safe iteration cap.',
]

const SYSTEMS = [
  {
    icon: Workflow,
    title: 'The ReAct loop',
    body: 'Chat is a tool-calling agent over ~40 tools, with a focused subset advertised each turn so the local model stays sharp. Reads run immediately; writes are held for approval. Skills scope the agent to a goal and a limited tool set without granting any extra privilege.',
  },
  {
    icon: Search,
    title: 'Grounded retrieval',
    body: 'Your query is embedded and matched against a local vector index of everything you keep. The top results become context the model must answer from — with source chips — rather than guessing.',
  },
  {
    icon: Brain,
    title: 'Memory that fills itself',
    body: 'Every entity change re-renders to text and re-embeds locally. Durable facts you mention in chat are saved as notes. That is why Cortex can recall your past and cite it.',
  },
  {
    icon: ShieldCheck,
    title: 'The approval gate',
    body: 'Each proposed write loads the target, computes a human-readable diff, and waits. On approval, the merged fields are re-validated against the same schema the HTTP API uses before anything is written.',
  },
  {
    icon: Bell,
    title: 'Proactive detectors',
    body: 'A scheduler runs detectors over your data — stagnant projects, overdue Q1 tasks, streak risk, journal gaps, action emails — phrases a short nudge locally, and learns from what you dismiss.',
  },
  {
    icon: Lightbulb,
    title: 'Insight & coaching',
    body: 'Deterministic detectors find real cross-domain patterns — mood vs. habits, neglected areas, spending trends — and the model only phrases the numbers. Per-lane Life Agents score domain health and coach on a cadence: advice only, never writing your data.',
  },
  {
    icon: Radio,
    title: 'Local capture & transcription',
    body: 'Voice, photo, call, and optional ambient input are transcribed and OCR’d on-device with Whisper and a local vision model (Hindi and English). Raw audio is discarded; only the text is kept, and ambient transcripts auto-purge.',
  },
  {
    icon: Database,
    title: 'The local stack',
    body: 'A React + Vite frontend on :5173, an Express + Mongoose backend on :4000, MongoDB for storage, and Ollama for both reasoning (gemma4:12b) and embeddings (qwen3-embedding).',
  },
]

export function HowItWorksPage() {
  usePageTitle('How it works — Cortex')
  return (
    <>
      <section className="mkt-hero" style={{ gridTemplateColumns: '1fr', paddingBottom: 'var(--sp-8)' }}>
        <div>
          <p className="mkt-eyebrow">Under the hood</p>
          <h1 style={{ maxWidth: '20ch' }}>An agent that grounds, proposes, and waits.</h1>
          <p className="mkt-hero-sub">
            Cortex is not a chatbot bolted onto a notes app. It’s a retrieval-grounded, tool-calling
            agent with a hard approval gate — all running locally. Here’s the machinery.
          </p>
        </div>
      </section>

      <section className="mkt-section">
        <p className="mkt-eyebrow">The loop</p>
        <h2 className="mkt-section-title">One turn, start to finish.</h2>
        <div className="mkt-steps">
          {LOOP.map((step, i) => (
            <div key={step} className="mkt-step">
              <div className="mkt-step-n">{String(i + 1).padStart(2, '0')}</div>
              <p style={{ marginTop: 'var(--sp-3)', color: 'var(--muted)', fontSize: 13, lineHeight: 1.55 }}>
                {step}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section">
        <p className="mkt-eyebrow">The parts</p>
        <h2 className="mkt-section-title">Eight systems, one mind.</h2>
        <div className="hiw-grid">
          {SYSTEMS.map((s) => (
            <div key={s.title} className="hiw-card">
              <h3>
                <s.icon size={18} strokeWidth={2} /> {s.title}
              </h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-cta">
          <span className="empty-orbit">
            <Cpu size={24} strokeWidth={1.75} />
          </span>
          <h2>It all runs on your machine.</h2>
          <p>No cloud inference, no remote database. The guide walks you through getting it running.</p>
          <div className="mkt-actions">
            <Link to="/guide" className="btn primary mkt-btn-lg">
              Read the guide
            </Link>
            <Link to="/privacy" className="btn ghost mkt-btn-lg">
              See the privacy model
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
