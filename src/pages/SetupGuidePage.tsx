import { ArrowRight, CheckCircle2, Circle, CircleSlash, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useSetupStatus, type SetupItem, type SetupStatusValue } from '../api/setup'
import { PageHeader } from '../components/ui'

export function SetupGuidePage() {
  const { data, isPending, isError } = useSetupStatus()

  if (isPending) return <p className="muted">Loading…</p>
  if (isError || !data) return <p className="error">Failed to load setup status.</p>

  const { sections, essentialsDone, essentialsTotal } = data
  const essentialsReady = essentialsTotal > 0 && essentialsDone >= essentialsTotal
  const pct = essentialsTotal ? Math.round((essentialsDone / essentialsTotal) * 100) : 100

  return (
    <div>
      <PageHeader
        title="Setup guide"
        subtitle="Keys & config to set after signing in — required and optional"
      />

      <section className="card setup-summary">
        <div className="setup-summary-head">
          <div>
            <h2 className="setup-summary-title">
              {essentialsReady ? 'Essentials ready' : 'Finish the essentials'}
            </h2>
            <p className="muted small">
              {essentialsReady
                ? 'Cortex has what it needs to think. The rest below is optional — add it as you go.'
                : 'Cortex needs a local model before it can answer. Complete the required items below.'}
            </p>
          </div>
          <span className="setup-summary-count mono">
            {essentialsDone}/{essentialsTotal}
          </span>
        </div>
        <div className="setup-progress">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="muted small setup-note">
          Secrets are entered on this machine and stored encrypted — they are never displayed back here.
        </p>
      </section>

      {sections.map((s) => (
        <section key={s.id} className="card setup-section">
          <h2 className="setup-section-title">
            {s.title}
            {s.info && <span className="muted small"> · applies on restart</span>}
          </h2>
          <div className="setup-list">
            {s.items.map((item) => (
              <SetupRow key={item.id} item={item} info={s.info} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function StatusIcon({ status }: { status: SetupStatusValue }) {
  if (status === 'done') return <CheckCircle2 size={18} className="setup-ic done" />
  if (status === 'off') return <CircleSlash size={18} className="setup-ic off" />
  if (status === 'unknown') return <HelpCircle size={18} className="setup-ic off" />
  return <Circle size={18} className="setup-ic todo" />
}

function SetupRow({ item, info }: { item: SetupItem; info?: boolean }) {
  const off = item.status === 'off'
  // An 'off' surface is gated by its feature toggle — send the owner to enable it first.
  const href = off ? '/settings#features' : item.link
  const verb = off ? 'Enable' : item.status === 'done' ? 'Manage' : 'Configure'

  return (
    <div className={`setup-row status-${item.status}`}>
      <StatusIcon status={item.status} />
      <div className="setup-row-body">
        <div className="setup-row-head">
          <span className="setup-row-label">{item.label}</span>
          {item.required && <span className="setup-chip req">Required</span>}
          {!item.required && !info && <span className="setup-chip opt">Optional</span>}
          {!item.live && <span className="settings-badge">restart</span>}
        </div>
        {item.note && <p className="muted small setup-row-note">{item.note}</p>}
        {item.detail && <p className="setup-row-detail mono">{item.detail}</p>}
      </div>
      <Link className="setup-row-link" to={href}>
        {verb} <ArrowRight size={13} />
      </Link>
    </div>
  )
}
