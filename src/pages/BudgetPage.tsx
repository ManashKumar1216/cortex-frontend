import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

import { ChevronLeft, ChevronRight, CreditCard, Plus, Upload, X } from 'lucide-react'

import {
  importStatement,
  useBills,
  useBudgetActions,
  useBudgetSummary,
  useExpenseSuggestions,
  usePaymentMethods,
  useTargets,
  useTransactions,
} from '../api/budget'
import { Modal } from '../components/Modal'
import { AreaSelect } from '../components/selects'
import { EmptyState, Field, PageHeader, Tabs } from '../components/ui'
import { formatDay, formatMoney } from '../lib/format'
import type { BudgetSummary, PaymentMethod, Transaction } from '../lib/types'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

type Tab = 'overview' | 'ledger' | 'bills' | 'cards' | 'import'

export function BudgetPage() {
  const [month, setMonth] = useState(currentMonth())
  const [tab, setTab] = useState<Tab>('overview')
  const summary = useBudgetSummary(month)
  const currency = summary.data?.currency.code ?? 'INR'
  const fmt = (n: number) => formatMoney(n, currency)

  return (
    <div>
      <PageHeader title="Budget" subtitle="Where your money goes, by life-area" />

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        tabs={(['overview', 'ledger', 'bills', 'cards', 'import'] as Tab[]).map((t) => ({
          value: t,
          label: t[0].toUpperCase() + t.slice(1),
        }))}
      />
      <div style={{ height: 'var(--sp-2)' }} />

      {tab !== 'cards' && tab !== 'import' && (
        <div className="budget-monthnav">
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <strong>{monthLabel(month)}</strong>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {summary.isError && <p className="error">{(summary.error as Error).message}</p>}

      {tab === 'overview' && summary.data && <Overview s={summary.data} fmt={fmt} />}
      {tab === 'ledger' && <Ledger month={month} fmt={fmt} />}
      {tab === 'bills' && <Bills fmt={fmt} />}
      {tab === 'cards' && <Cards s={summary.data} fmt={fmt} />}
      {tab === 'import' && <Import fmt={fmt} />}
    </div>
  )
}

function Bar({ spent, limit }: { spent: number; limit: number | null }) {
  if (limit == null || limit <= 0) return null
  const pct = Math.min(100, Math.round((spent / limit) * 100))
  return (
    <div className={`budget-bar${spent > limit ? ' over' : ''}`}>
      <div className="budget-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

function Overview({ s, fmt }: { s: BudgetSummary; fmt: (n: number) => string }) {
  const [editing, setEditing] = useState(false)
  return (
    <div>
      <section className="card budget-overall">
        <div className="row-between">
          <div>
            <div className="budget-spent">
              {fmt(s.overall.spent)}
              {s.overall.limit != null && <span className="muted"> / {fmt(s.overall.limit)}</span>}
            </div>
            <span className="muted small">
              {s.overall.pace ? `${s.overall.pace} · ` : ''}
              {s.overall.daysLeft} days left · net {fmt(s.totals.net)} · {s.totals.count} entries
            </span>
          </div>
          <button className="btn ghost sm" onClick={() => setEditing(true)}>
            Set budgets
          </button>
        </div>
        <Bar spent={s.overall.spent} limit={s.overall.limit} />
      </section>

      <h2 className="budget-h2">By area</h2>
      {s.byArea.length === 0 && <p className="muted small">No spending recorded this month.</p>}
      <div className="list">
        {s.byArea.map((a) => (
          <div key={a.areaId ?? 'none'} className="card budget-row">
            <div className="row-between">
              <span>
                {a.code && <span className="area-code">{a.code}</span>} {a.name}
              </span>
              <span className={a.over ? 'badge bad' : 'muted'}>
                {fmt(a.spent)}
                {a.limit != null && ` / ${fmt(a.limit)}`}
              </span>
            </div>
            <Bar spent={a.spent} limit={a.limit} />
          </div>
        ))}
      </div>

      {s.cards.length > 0 && (
        <>
          <h2 className="budget-h2">Cards</h2>
          <div className="list">
            {s.cards.map((c) => (
              <div key={c.id} className="card budget-row">
                <div className="row-between">
                  <span>
                    <CreditCard size={14} /> {c.name}
                    {c.last4 ? ` ••${c.last4}` : ''}
                  </span>
                  <span className="muted">
                    {fmt(c.outstanding)} outstanding
                    {c.creditLimit != null && ` · ${fmt(c.available ?? 0)} left`}
                  </span>
                </div>
                {c.creditLimit != null && <Bar spent={c.outstanding} limit={c.creditLimit} />}
              </div>
            ))}
          </div>
        </>
      )}

      {s.upcomingBills.length > 0 && (
        <>
          <h2 className="budget-h2">Upcoming bills</h2>
          <div className="list">
            {s.upcomingBills.map((b) => (
              <div key={b.id} className="card budget-row row-between">
                <span>{b.name}</span>
                <span className="muted small">
                  {b.amount != null ? `${fmt(b.amount)} · ` : ''}
                  {b.daysUntil < 0 ? `overdue` : b.daysUntil === 0 ? 'due today' : `in ${b.daysUntil}d`} ({b.nextDue})
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && <TargetsModal s={s} fmt={fmt} onClose={() => setEditing(false)} />}
    </div>
  )
}

function TargetsModal({ s, fmt, onClose }: { s: BudgetSummary; fmt: (n: number) => string; onClose: () => void }) {
  const { data: targets } = useTargets()
  const actions = useBudgetActions()
  const initial = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of targets ?? []) map.set(t.areaId ?? 'overall', t.monthlyLimit)
    return map
  }, [targets])
  const [vals, setVals] = useState<Record<string, string>>({})

  const get = (key: string) => vals[key] ?? String(initial.get(key) ?? '')
  const set = (key: string, v: string) => setVals((p) => ({ ...p, [key]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const out = [{ areaId: null as string | null, monthlyLimit: Number(get('overall')) || 0 }]
    for (const a of s.byArea) {
      if (a.areaId) out.push({ areaId: a.areaId, monthlyLimit: Number(get(a.areaId)) || 0 })
    }
    actions.saveTargets.mutate(out, { onSuccess: onClose })
  }

  return (
    <Modal title="Monthly budgets" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label={`Overall (${fmt(0).replace(/[\d.,\s]/g, '')})`}>
          <input className="input" type="number" min={0} value={get('overall')} onChange={(e) => set('overall', e.target.value)} placeholder="No limit" />
        </Field>
        <p className="muted small">Per-area limits (leave blank for none):</p>
        {s.byArea.filter((a) => a.areaId).map((a) => (
          <Field key={a.areaId} label={`${a.code ? `${a.code} ` : ''}${a.name}`}>
            <input className="input" type="number" min={0} value={get(a.areaId as string)} onChange={(e) => set(a.areaId as string, e.target.value)} placeholder="No limit" />
          </Field>
        ))}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={actions.saveTargets.isPending}>Save</button>
        </div>
      </form>
    </Modal>
  )
}

function MethodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = usePaymentMethods()
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">No method</option>
      {(data ?? []).filter((m) => !m.archived).map((m) => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </select>
  )
}

function Ledger({ month, fmt }: { month: string; fmt: (n: number) => string }) {
  const { data, isPending } = useTransactions(month)
  const { data: methods } = usePaymentMethods()
  const actions = useBudgetActions()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [areaId, setAreaId] = useState('')
  const [method, setMethod] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const methodName = (id?: string | null) => methods?.find((m) => m.id === id)?.name

  const add = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(amount)
    if (!n || n <= 0) return
    actions.createTxn.mutate(
      { amount: n, type, note: note.trim() || undefined, areaId: areaId || undefined, paymentMethodId: method || undefined },
      { onSuccess: () => { setAmount(''); setNote('') } },
    )
  }

  return (
    <div>
      <form className="card budget-quickadd" onSubmit={add}>
        <input className="input" type="number" min={0} step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="input" placeholder="What for?" value={note} onChange={(e) => setNote(e.target.value)} />
        <AreaSelect value={areaId} onChange={setAreaId} emptyLabel="No area" />
        <MethodSelect value={method} onChange={setMethod} />
        <select className="input" value={type} onChange={(e) => setType(e.target.value as 'expense' | 'income')}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button className="btn primary" type="submit" disabled={actions.createTxn.isPending}>
          <Plus size={14} /> Log
        </button>
      </form>

      {isPending && <p className="muted">Loading…</p>}
      {data && data.length === 0 && <EmptyState message="No transactions this month." hint="Log one above, say it in Chat, or import a statement." />}
      <div className="list">
        {data?.map((t: Transaction) => (
          <div key={t.id} className="card budget-row row-between">
            <div>
              <strong>{t.note || (t.type === 'income' ? 'Income' : 'Expense')}</strong>
              <span className="muted small budget-txn-meta">
                {formatDay(t.date)}
                {methodName(t.paymentMethodId) ? ` · ${methodName(t.paymentMethodId)}` : ''}
                {t.source !== 'manual' ? ` · ${t.source}` : ''}
              </span>
            </div>
            <div className="row">
              <span className={t.type === 'income' ? 'ok-amt' : t.type === 'card_payment' ? 'muted' : 'exp-amt'}>
                {t.type === 'income' ? '+' : t.type === 'card_payment' ? '' : '−'}
                {fmt(t.amount)}
              </span>
              <button className="icon-btn" aria-label="Delete" onClick={() => actions.deleteTxn.mutate(t.id)}>
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Bills({ fmt }: { fmt: (n: number) => string }) {
  const { data, isPending } = useBills()
  const actions = useBudgetActions()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div className="row-between budget-sectionhead">
        <h2 className="budget-h2">Bills</h2>
        <button className="btn primary sm" onClick={() => setOpen(true)}><Plus size={14} /> Bill</button>
      </div>
      {isPending && <p className="muted">Loading…</p>}
      {data && data.length === 0 && <EmptyState message="No bills yet." hint="Add rent, subscriptions, or a card payment to get due reminders." />}
      <div className="list">
        {data?.map((b) => (
          <div key={b.id} className="card budget-row row-between">
            <div>
              <strong>{b.name}</strong>
              <span className="muted small budget-txn-meta">
                {b.amount != null ? `${fmt(b.amount)} · ` : ''}{b.recurrence.kind} · due {b.nextDue}
                {b.kind === 'card_payment' ? ' · card' : ''}
              </span>
            </div>
            <div className="row">
              <button className="btn ghost sm" onClick={() => actions.payBill.mutate({ id: b.id })} disabled={actions.payBill.isPending}>Paid</button>
              {b.kind !== 'card_payment' && (
                <button className="icon-btn" aria-label="Delete" onClick={() => actions.deleteBill.mutate(b.id)}><X size={14} /></button>
              )}
            </div>
          </div>
        ))}
      </div>
      {open && <BillModal onClose={() => setOpen(false)} />}
    </div>
  )
}

function BillModal({ onClose }: { onClose: () => void }) {
  const actions = useBudgetActions()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'monthly' | 'weekly' | 'yearly'>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [areaId, setAreaId] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    actions.createBill.mutate(
      {
        name: name.trim(),
        amount: amount ? Number(amount) : undefined,
        areaId: areaId || undefined,
        recurrence: { kind, ...(kind !== 'weekly' ? { dayOfMonth: Number(dayOfMonth) || 1 } : {}) },
      },
      { onSuccess: onClose },
    )
  }
  return (
    <Modal title="New bill" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Amount (optional)"><input className="input" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Repeats">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as 'monthly' | 'weekly' | 'yearly')}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        {kind !== 'weekly' && (
          <Field label="Day of month"><input className="input" type="number" min={1} max={28} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} /></Field>
        )}
        <Field label="Area (optional)"><AreaSelect value={areaId} onChange={setAreaId} emptyLabel="No area" /></Field>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={actions.createBill.isPending}>Save</button>
        </div>
      </form>
    </Modal>
  )
}

function Cards({ s, fmt }: { s?: BudgetSummary; fmt: (n: number) => string }) {
  const { data, isPending } = usePaymentMethods()
  const actions = useBudgetActions()
  const [open, setOpen] = useState(false)
  const outstanding = (id: string) => s?.cards.find((c) => c.id === id)?.outstanding
  return (
    <div>
      <div className="row-between budget-sectionhead">
        <h2 className="budget-h2">Payment methods</h2>
        <button className="btn primary sm" onClick={() => setOpen(true)}><Plus size={14} /> Method</button>
      </div>
      {isPending && <p className="muted">Loading…</p>}
      {data && data.length === 0 && <EmptyState message="No payment methods yet." hint="Add a card or account to track spend per method." />}
      <div className="list">
        {data?.filter((m) => !m.archived).map((m) => (
          <div key={m.id} className="card budget-row row-between">
            <div>
              <strong>{m.name}</strong>{m.last4 ? ` ••${m.last4}` : ''}
              <span className="muted small budget-txn-meta">
                {m.kind}
                {m.kind === 'credit' && m.creditLimit != null ? ` · ${fmt(outstanding(m.id) ?? 0)} / ${fmt(m.creditLimit)}` : ''}
                {m.kind === 'credit' && m.dueDay ? ` · due day ${m.dueDay}` : ''}
              </span>
            </div>
            <button className="icon-btn" aria-label="Delete" onClick={() => actions.deleteMethod.mutate(m.id)}><X size={14} /></button>
          </div>
        ))}
      </div>
      {open && <MethodModal onClose={() => setOpen(false)} />}
    </div>
  )
}

function MethodModal({ onClose }: { onClose: () => void }) {
  const actions = useBudgetActions()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<PaymentMethod['kind']>('credit')
  const [last4, setLast4] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [statementDay, setStatementDay] = useState('')
  const [dueDay, setDueDay] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const body: Record<string, unknown> = { name: name.trim(), kind, last4: last4.trim() || undefined }
    if (kind === 'credit') {
      if (creditLimit) body.creditLimit = Number(creditLimit)
      if (statementDay) body.statementDay = Number(statementDay)
      if (dueDay) body.dueDay = Number(dueDay)
    }
    actions.createMethod.mutate(body, { onSuccess: onClose })
  }
  return (
    <Modal title="New payment method" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Type">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as PaymentMethod['kind'])}>
            <option value="credit">Credit card</option>
            <option value="debit">Debit card</option>
            <option value="bank">Bank account</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
          </select>
        </Field>
        <Field label="Last 4 (optional)"><input className="input" value={last4} onChange={(e) => setLast4(e.target.value)} maxLength={4} /></Field>
        {kind === 'credit' && (
          <>
            <Field label="Credit limit"><input className="input" type="number" min={0} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} /></Field>
            <Field label="Statement day (1–28)"><input className="input" type="number" min={1} max={28} value={statementDay} onChange={(e) => setStatementDay(e.target.value)} /></Field>
            <Field label="Due day (1–28) — sets up an auto bill reminder"><input className="input" type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></Field>
          </>
        )}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={actions.createMethod.isPending}>Save</button>
        </div>
      </form>
    </Modal>
  )
}

function Import({ fmt }: { fmt: (n: number) => string }) {
  const { data, isPending } = useExpenseSuggestions()
  const actions = useBudgetActions()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setMsg('')
    try {
      const r = await importStatement(file)
      setMsg(`Parsed ${r.parsed} rows → ${r.created} expenses to review.`)
    } catch (err) {
      setMsg((err as Error).message)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const pending = data ?? []

  return (
    <div>
      <section className="card budget-import">
        <div className="budget-import-head"><Upload size={16} /> Import a statement (CSV)</div>
        <p className="muted small">Columns are auto-detected (date, amount, description). Rows become reviewable suggestions — nothing is added until you confirm. Bank transaction-alert emails also appear here.</p>
        <label className="btn ghost sm budget-upload">
          {busy ? 'Importing…' : 'Choose CSV'}
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} hidden />
        </label>
        {msg && <p className="muted small">{msg}</p>}
      </section>

      <div className="row-between budget-sectionhead">
        <h2 className="budget-h2">To review {pending.length > 0 && <span className="muted">({pending.length})</span>}</h2>
        {pending.length > 1 && (
          <button className="btn ghost sm" onClick={() => actions.bulkAdd.mutate(pending.map((p) => p.id))} disabled={actions.bulkAdd.isPending}>
            Add all
          </button>
        )}
      </div>
      {isPending && <p className="muted">Loading…</p>}
      {pending.length === 0 && <p className="muted small">Nothing to review.</p>}
      <div className="list">
        {pending.map((sug) => (
          <div key={sug.id} className="card budget-row row-between">
            <div>
              <strong>{sug.merchant || 'Expense'}</strong>
              <span className="muted small budget-txn-meta">
                {fmt(sug.amount)}{sug.date ? ` · ${formatDay(sug.date)}` : ''} · {sug.sourceType === 'email_alert' ? 'bank email' : sug.sourceType}
              </span>
            </div>
            <div className="row">
              <button className="btn primary sm" onClick={() => actions.addSuggestion.mutate(sug.id)} disabled={actions.addSuggestion.isPending}>Add</button>
              <button className="btn ghost sm" onClick={() => actions.dismissSuggestion.mutate(sug.id)} disabled={actions.dismissSuggestion.isPending}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
