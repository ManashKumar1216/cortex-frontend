import { Check, Eye, KeyRound, MicOff, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EGRESS_PATHS, STAYS_LOCAL } from '../../lib/marketing-content'
import { usePageTitle } from '../../lib/usePageTitle'

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: 'Confirm before write',
    body: 'The agent can propose creating a task, updating a project, or sending an email — but every write shows a before/after preview and waits for your Approve, Edit, or Cancel.',
  },
  {
    icon: MicOff,
    title: 'The microphone is yours',
    body: 'Ambient capture is off until you switch it on. When it is on, audio is transcribed locally and immediately discarded — only text is kept, it auto-purges after two weeks, and one tap forgets everything. No audio ever leaves the machine.',
  },
  {
    icon: KeyRound,
    title: 'Credentials encrypted at rest',
    body: 'Mailbox passwords are encrypted before they touch the database and are never returned to the screen or the API. Nothing is proxied through a third party.',
  },
  {
    icon: Eye,
    title: 'Verifiable, not just promised',
    body: 'Open your browser’s network tab and watch: with the optional paths off, Cortex talks only to your own backend. The quiet is the proof.',
  },
]

export function PrivacyPage() {
  usePageTitle('Privacy & local-first — Cortex')
  return (
    <>
      <section className="mkt-hero" style={{ gridTemplateColumns: '1fr', paddingBottom: 'var(--sp-8)' }}>
        <div>
          <p className="mkt-eyebrow">Privacy &amp; local-first</p>
          <h1 style={{ maxWidth: '18ch' }}>Your data has one home: this machine.</h1>
          <p className="mkt-hero-sub">
            Cortex runs a local LLM (Ollama) against a local database (MongoDB). There is no cloud
            account, no telemetry, and no analytics. This page is the full, honest map of what stays —
            and of every path that can carry anything out: most off until you wire them, two on by
            default and easy to disable, and none of them uploading your data.
          </p>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-band">
          <div className="mkt-dataflow">
            <div>
              <h3>Never leaves your machine</h3>
              <ul className="mkt-list stays">
                {STAYS_LOCAL.map((item) => (
                  <li key={item}>
                    <Check size={15} strokeWidth={2.4} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Every way out, and its default</h3>
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
            Cortex is a thinking partner you don’t have to trust with the cloud — because there
            isn’t one.
          </p>
        </div>
      </section>

      <section className="mkt-section">
        <p className="mkt-eyebrow">How control works</p>
        <h2 className="mkt-section-title">You hold the door at every step.</h2>
        <div className="mkt-pillars">
          {GUARANTEES.map((g) => (
            <div key={g.title} className="mkt-pillar">
              <span className="mkt-pillar-icon">
                <g.icon size={20} strokeWidth={2} />
              </span>
              <h3>{g.title}</h3>
              <p>{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-cta">
          <span className="empty-orbit">🔒</span>
          <h2>Local · Private.</h2>
          <p>It’s not a setting you switch on. It’s how Cortex is built.</p>
          <div className="mkt-actions">
            <Link to="/login" className="btn primary mkt-btn-lg">
              Get started
            </Link>
            <Link to="/how-it-works" className="btn ghost mkt-btn-lg">
              See the architecture
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
