import { useState, type FormEvent } from 'react'

import { Globe, Pencil, Play, Plus, Power, Repeat, RotateCcw, Sparkles, Trash2 } from 'lucide-react'

import {
  useActivateBuiltinAutomation,
  useAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  useRunAutomation,
  useUpdateAutomation,
  type AutomationInput,
  type AutomationView,
} from '../api/automations'
import { Modal } from '../components/Modal'
import { Badge, Button, Card, PageHeader, useConfirm, useToast } from '../components/ui'
import { formatDateTime, useTimeFormat } from '../lib/time'

type RecKind = 'none' | 'daily' | 'weekly' | 'monthly' | 'cron'

const KIND_LABEL: Record<RecKind, string> = {
  none: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  cron: 'Custom (cron)',
}

function scheduleSummary(a: AutomationView): string {
  const kind = (a.recurrence?.kind ?? 'daily') as RecKind
  if (kind === 'cron') return `cron: ${a.recurrence?.cronExpression ?? '—'}`
  return KIND_LABEL[kind]
}

/** Convert an ISO string to the value a <input type="datetime-local"> expects. */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AutomationsPage() {
  const { data, isPending, isError, error } = useAutomations()
  const run = useRunAutomation()
  const remove = useDeleteAutomation()
  const update = useUpdateAutomation()
  const activate = useActivateBuiltinAutomation()
  const timeFmt = useTimeFormat()
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<AutomationView | 'new' | null>(null)

  const list = data ?? []
  const builtins = list.filter((a) => a.builtin)
  const mine = list.filter((a) => !a.builtin)

  const runNow = (a: AutomationView) => {
    if (!a.id) return
    run.mutate(a.id, {
      onSuccess: (r) => toast.show(r.ok ? `Ran "${a.name}".` : `"${a.name}" failed.`, r.ok ? 'success' : 'error'),
    })
  }

  const toggle = (a: AutomationView) => {
    const next = !a.enabled
    if (a.builtin) {
      activate.mutate(
        { slug: a.builtinSlug ?? '', enabled: next },
        { onSuccess: () => toast.show(next ? 'Activated' : 'Disabled') },
      )
    } else if (a.id) {
      update.mutate(
        { id: a.id, body: { enabled: next } },
        { onSuccess: () => toast.show(next ? 'Enabled' : 'Disabled') },
      )
    }
  }

  const activateBuiltin = (a: AutomationView) => {
    activate.mutate(
      { slug: a.builtinSlug ?? '', enabled: true },
      { onSuccess: () => toast.show(`Activated "${a.name}".`, 'success') },
    )
  }

  const resetOrDelete = async (a: AutomationView) => {
    if (!a.id) return
    const ok = await confirm(
      a.builtin
        ? { message: `Reset "${a.name}" to its built-in default? Your changes and schedule will be discarded.`, confirmLabel: 'Reset' }
        : { message: `Delete automation "${a.name}"?`, danger: true, confirmLabel: 'Delete' },
    )
    if (!ok) return
    remove.mutate(a.id, { onSuccess: () => toast.show(a.builtin ? 'Reset to built-in' : 'Deleted') })
  }

  const renderCard = (a: AutomationView) => {
    const pristine = a.builtin && !a.activated
    return (
      <Card key={a.builtinSlug ?? a.id}>
        <div className="row-between">
          <div className="row" style={{ gap: 8 }}>
            <Repeat size={15} className="muted" />
            <strong>{a.name}</strong>
            {a.builtin && <Badge kind="muted">built-in</Badge>}
            {a.builtin && a.customized && <Badge kind="accent">customized</Badge>}
            {a.activated && !a.enabled && <Badge kind="muted">paused</Badge>}
            {a.webSearch && (
              <Badge kind="info">
                <Globe size={11} /> web
              </Badge>
            )}
            {a.lastStatus === 'error' && <Badge kind="warn">last run failed</Badge>}
          </div>
          <div className="row" style={{ gap: 4 }}>
            {pristine ? (
              <Button variant="primary" size="sm" icon={<Sparkles size={13} />} loading={activate.isPending} onClick={() => activateBuiltin(a)}>
                Activate
              </Button>
            ) : (
              <>
                {a.enabled && (
                  <Button variant="ghost" size="sm" icon={<Play size={13} />} loading={run.isPending} onClick={() => runNow(a)}>
                    Run now
                  </Button>
                )}
                <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => setEditing(a)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" icon={<Power size={13} />} onClick={() => toggle(a)}>
                  {a.enabled ? 'Disable' : 'Enable'}
                </Button>
                {a.builtin ? (
                  <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={() => void resetOrDelete(a)}>
                    Reset
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => void resetOrDelete(a)}>
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 4 }}>
          {a.builtin && a.description && !a.customized ? a.description : a.prompt}
        </p>
        <p className="muted small mono">
          {scheduleSummary(a)}
          {pristine
            ? ' · not activated'
            : a.nextRunAt
              ? ` · next ${formatDateTime(a.nextRunAt, timeFmt)}`
              : ''}
          {a.lastRunAt ? ` · last ${formatDateTime(a.lastRunAt, timeFmt)}` : ''}
        </p>
        {a.lastOutput && <p className="automation-output">{a.lastOutput}</p>}
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        title="Automations"
        subtitle="Saved jobs that run on a schedule and report back — your private briefing engine."
        action={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing('new')}>
            New automation
          </Button>
        }
      />

      {isPending && <p className="muted">Loading…</p>}
      {isError && <p className="error">{(error as Error).message}</p>}

      {mine.length > 0 && (
        <section className="skill-section">
          <h2 className="skill-section-title">Your automations</h2>
          <div className="list">{mine.map(renderCard)}</div>
        </section>
      )}

      {builtins.length > 0 && (
        <section className="skill-section">
          <h2 className="skill-section-title">Built-in</h2>
          <p className="muted small" style={{ marginTop: -4, marginBottom: 10 }}>
            Ready-made briefings — on by default and running on a sensible schedule. Edit, disable, or reset any one.
          </p>
          <div className="list">{builtins.map(renderCard)}</div>
        </section>
      )}

      {editing && (
        <AutomationModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function AutomationModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: AutomationView | null
  onClose: () => void
  onSaved: () => void
}) {
  const create = useCreateAutomation()
  const update = useUpdateAutomation()
  const builtin = initial?.builtin ?? false
  const [name, setName] = useState(initial?.name ?? '')
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [kind, setKind] = useState<RecKind>((initial?.recurrence?.kind as RecKind) ?? 'daily')
  const [cron, setCron] = useState(initial?.recurrence?.cronExpression ?? '')
  const [when, setWhen] = useState(initial?.nextRunAt ? toLocalInput(initial.nextRunAt) : '')
  const [push, setPush] = useState(initial ? initial.deliver.includes('push') : false)
  const [inbox, setInbox] = useState(initial ? initial.deliver.includes('inbox') : true)
  const [web, setWeb] = useState(initial?.webSearch ?? false)
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !prompt.trim()) return
    const deliver: ('push' | 'inbox')[] = []
    if (push) deliver.push('push')
    if (inbox) deliver.push('inbox')
    const body: AutomationInput = {
      name: name.trim(),
      prompt: prompt.trim(),
      recurrence: { kind, ...(kind === 'cron' ? { cronExpression: cron.trim() } : {}) },
      nextRunAt: when ? new Date(when).toISOString() : new Date().toISOString(),
      deliver: deliver.length ? deliver : ['inbox'],
      webSearch: web,
      enabled,
    }
    const done = { onSuccess: onSaved }
    if (initial?.id) update.mutate({ id: initial.id, body }, done)
    else create.mutate(body, done)
  }

  const title = !initial ? 'New automation' : builtin ? `Edit built-in · ${initial.name}` : 'Edit automation'

  return (
    <Modal title={title} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {builtin && (
          <p className="muted small">
            This is your own copy of a built-in. Use “Reset” on the card to restore the default.
          </p>
        )}
        <label className="field">
          <span>Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning AI briefing" autoFocus />
        </label>
        <label className="field">
          <span>What should it do?</span>
          <textarea
            className="input"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Summarize anything new in my notes about my Q3 launch in 5 bullets."
          />
        </label>
        <div className="row" style={{ gap: 8 }}>
          <label className="field">
            <span>Repeat</span>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as RecKind)}>
              {(Object.keys(KIND_LABEL) as RecKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>First run</span>
            <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
        </div>
        {kind === 'cron' && (
          <label className="field">
            <span>Cron expression</span>
            <input className="input" value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 8 * * 1-5" />
          </label>
        )}
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={inbox} onChange={(e) => setInbox(e.target.checked)} /> Inbox
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /> Push
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} /> Use web search
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={create.isPending || update.isPending}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
