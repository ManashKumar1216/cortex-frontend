import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ApprovalDemo } from '../../components/public/ApprovalDemo'
import { EGRESS_PATHS, FEATURES, INTELLIGENCE, PILLARS, STAYS_LOCAL, STEPS } from '../../lib/marketing-content'
import { usePageTitle } from '../../lib/usePageTitle'

const TRUST = [
  { label: 'Telemetry', value: 'None, ever' },
  { label: 'LLM', value: 'Runs locally (Ollama)' },
  { label: 'Data', value: 'Stays on your disk' },
]

export function LandingPage() {
  usePageTitle('Cortex — your mind, kept private')
  return (
    <>
      {/* Hero */}
      <section className="mkt-hero">
        <div>
          <p className="mkt-eyebrow">Local · Private · Yours</p>
          <h1>Your mind, kept&nbsp;private.</h1>
          <p className="mkt-hero-sub">
            Cortex is a local-first second brain. It runs entirely on your machine — your tasks,
            journal, email, and memory never leave it. An AI that thinks with you, grounded in your
            own life, on local inference with no cloud account.
          </p>
          <div className="mkt-actions">
            <Link to="/login" className="btn primary mkt-btn-lg">
              Get started <ArrowRight size={16} />
            </Link>
            <Link to="/guide" className="btn ghost mkt-btn-lg">
              See how it works
            </Link>
          </div>
          <p className="mkt-whisper">No account in the cloud. No telemetry. One machine — yours.</p>
          <div className="mkt-trust">
            {TRUST.map((t) => (
              <div key={t.label} className="mkt-stat">
                <div className="mkt-stat-label">{t.label}</div>
                <div className="mkt-stat-value">{t.value}</div>
              </div>
            ))}
          </div>
        </div>
        <ApprovalDemo />
      </section>

      {/* What it is */}
      <section className="mkt-section">
        <p className="mkt-eyebrow">What it is</p>
        <h2 className="mkt-section-title">One place for your whole life — and only you have the key.</h2>
        <p className="mkt-lead">
          Cortex consolidates tasks, habits, projects, goals, journal, email, and a long-term memory
          into a single brain that runs on your computer. Ask it anything; it answers from your own
          data, cites where it looked, and refuses to guess.
        </p>
        <div className="mkt-pillars">
          {PILLARS.map((p) => (
            <div key={p.title} className="mkt-pillar">
              <span className="mkt-pillar-icon">
                <p.icon size={20} strokeWidth={2} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature showcase */}
      <section className="mkt-section">
        <p className="mkt-eyebrow">Inside Cortex</p>
        <h2 className="mkt-section-title">Eighteen rooms, one brain.</h2>
        <p className="mkt-lead">Every part of the app, walked honestly — this is the whole product.</p>
        <div className="mkt-features">
          {FEATURES.map((f) => (
            <div key={f.name} className={`mkt-feature${f.guarded ? ' guarded' : ''}`}>
              <div className="mkt-feature-head">
                <f.icon size={18} strokeWidth={2} />
                <span className="mkt-feature-name">{f.name}</span>
                {f.badge && <span className={`badge ${f.badge.kind}`}>{f.badge.text}</span>}
              </div>
              <p className="mkt-feature-line">{f.line}</p>
            </div>
          ))}
        </div>
        <p className="mkt-footnote">
          Voice, photo, and call capture transcribe locally via Whisper; Ambient stays off until you
          enable it. Email and WhatsApp are optional integrations you wire yourself — and WhatsApp is
          strictly read-only.
        </p>
      </section>

      {/* Intelligence layer */}
      <section className="mkt-section">
        <p className="mkt-eyebrow">It connects the dots</p>
        <h2 className="mkt-section-title">Not just storage — a mind that notices.</h2>
        <p className="mkt-lead">
          Beyond capturing your life, Cortex finds the patterns in it — deterministically, then
          phrased by the local model. It can surface a correlation, but never invent one.
        </p>
        <div className="mkt-features">
          {INTELLIGENCE.map((it) => (
            <div key={it.title} className="mkt-feature">
              <div className="mkt-feature-head">
                <it.icon size={18} strokeWidth={2} />
                <span className="mkt-feature-name">{it.title}</span>
              </div>
              <p className="mkt-feature-line">{it.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy — Nothing Leaves */}
      <section className="mkt-section">
        <p className="mkt-eyebrow">Nothing leaves</p>
        <h2 className="mkt-section-title">The cloud is optional. Every way out is listed.</h2>
        <div className="mkt-band" style={{ marginTop: 'var(--sp-6)' }}>
          <div className="mkt-dataflow">
            <div>
              <h3>Stays on your machine</h3>
              <ul className="mkt-list stays">
                {STAYS_LOCAL.map((item) => (
                  <li key={item}>
                    <Check size={15} strokeWidth={2.4} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>The ways out, mapped</h3>
              <div className="mkt-optin">
                {EGRESS_PATHS.map((o) => (
                  <div key={o.title} className="mkt-optin-item">
                    <div className="t">
                      {o.title} <span className={`badge ${o.flag.kind}`}>{o.flag.text}</span>
                    </div>
                    <p>{o.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mkt-reassure">
            No telemetry. No analytics. No account on someone else’s server. Your second brain has a
            door, and you hold it.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mkt-section">
        <p className="mkt-eyebrow">How it works</p>
        <h2 className="mkt-section-title">Roughly fifteen minutes from clone to first conversation.</h2>
        <div className="mkt-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="mkt-step">
              <div className="mkt-step-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mkt-section">
        <div className="mkt-cta">
          <span className="empty-orbit">🧠</span>
          <h2>Keep your mind to yourself.</h2>
          <p>
            Set up Cortex once. It’s yours after that — running quietly on your machine, learning
            only from you.
          </p>
          <div className="mkt-actions">
            <Link to="/login" className="btn primary mkt-btn-lg">
              Get started <ArrowRight size={16} />
            </Link>
            <Link to="/guide" className="btn ghost mkt-btn-lg">
              Read the guide
            </Link>
          </div>
          <p className="mkt-whisper">Open-source · Local-first · Single-owner by design.</p>
        </div>
      </section>
    </>
  )
}
