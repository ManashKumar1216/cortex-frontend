import type { ReactNode } from 'react'

import { Sparkles } from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function EmptyState({
  message,
  hint,
  icon,
}: {
  message: string
  hint?: string
  icon?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-orbit">{icon ?? <Sparkles size={22} strokeWidth={1.75} />}</span>
      <span className="empty-title">{message}</span>
      {hint && <span className="empty-hint">{hint}</span>}
    </div>
  )
}

const STATUS_CLASS: Record<string, string> = {
  active: 'ok',
  paused: 'muted',
  done: 'done',
  archived: 'muted',
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_CLASS[status] ?? 'muted'}`}>{status}</span>
}
