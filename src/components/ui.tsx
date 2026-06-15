import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'

import { AlertTriangle, CheckCircle2, Info, Loader2, Sparkles, X } from 'lucide-react'

import { Modal } from './Modal'
import { SubNav } from './SubNav'

/* ============================================================================
   Cortex UI primitives — a thin component layer over the existing token CSS.
   Colors/theme are untouched; these enforce consistency across surfaces.
   ========================================================================== */

/* ---------- Page header (title band) ---------- */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: ReactNode
  subtitle?: string
  eyebrow?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="page-head-wrap">
      <header className="page-header">
        <div>
          {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {action}
      </header>
      <SubNav />
    </div>
  )
}

/* ---------- Brand mark — a warm "rim of light" ring (replaces the 🧠 emoji) ---------- */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <defs>
          <radialGradient id="cortex-mark" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="var(--accent-2)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="9" stroke="url(#cortex-mark)" strokeWidth="2" opacity="0.9" />
        <circle cx="12" cy="12" r="3.4" fill="url(#cortex-mark)" />
      </svg>
    </span>
  )
}

/* ---------- Eyebrow (mono-caps section label) ---------- */
export function Eyebrow({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="eyebrow">
      {icon}
      {children}
    </span>
  )
}

/* ---------- Button ---------- */
type ButtonVariant = 'primary' | 'ghost' | 'default' | 'danger'
type ButtonSize = 'sm' | 'md'

export function Button({
  variant = 'default',
  size = 'md',
  full,
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  loading?: boolean
  icon?: ReactNode
}) {
  const variantClass =
    variant === 'primary' ? 'primary' : variant === 'ghost' ? 'ghost' : variant === 'danger' ? 'danger' : ''
  const cls = ['btn', variantClass, size === 'sm' ? 'sm' : '', full ? 'full' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={size === 'sm' ? 13 : 15} className="spin" /> : icon}
      {children}
    </button>
  )
}

/* ---------- Icon button ---------- */
export function IconButton({
  label,
  danger,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  const cls = ['icon-btn', danger ? 'danger' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}

/* ---------- Card ---------- */
type CardVariant = 'default' | 'interactive' | 'intelligence'

export function Card({
  eyebrow,
  eyebrowIcon,
  actions,
  variant = 'default',
  hero,
  className,
  children,
  ...rest
}: {
  eyebrow?: ReactNode
  eyebrowIcon?: ReactNode
  actions?: ReactNode
  variant?: CardVariant
  hero?: boolean
  className?: string
  children: ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'>) {
  const cls = [
    'card',
    variant === 'interactive' ? 'clickable' : '',
    variant === 'intelligence' ? 'intel-card' : '',
    hero ? 'card-hero' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <section className={cls} {...rest}>
      {(eyebrow || actions) && (
        <div className="card-head">
          {eyebrow && (
            <span className="card-eyebrow">
              {eyebrowIcon}
              {eyebrow}
            </span>
          )}
          {actions && <span className="card-head-actions">{actions}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

/* ---------- Badge ---------- */
type BadgeKind = 'ok' | 'bad' | 'warn' | 'done' | 'muted' | 'info' | 'accent'

export function Badge({ kind = 'muted', children }: { kind?: BadgeKind; children: ReactNode }) {
  return <span className={`badge ${kind}`}>{children}</span>
}

const STATUS_CLASS: Record<string, BadgeKind> = {
  active: 'ok',
  paused: 'muted',
  done: 'done',
  archived: 'muted',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge kind={STATUS_CLASS[status] ?? 'muted'}>{status}</Badge>
}

/* ---------- Chip (filter / toggle) ---------- */
export function Chip({
  active,
  count,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; count?: number }) {
  const cls = ['chip', active ? 'active' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {children}
      {count != null && <span className="chip-count mono">{count}</span>}
    </button>
  )
}

/* ---------- Tabs / segmented control ---------- */
export interface TabItem {
  value: string
  label: ReactNode
  icon?: ReactNode
  count?: number
}

export function Tabs({
  tabs,
  value,
  onChange,
  variant = 'underline',
}: {
  tabs: TabItem[]
  value: string
  onChange: (v: string) => void
  variant?: 'underline' | 'segmented'
}) {
  return (
    <div className={variant === 'segmented' ? 'seg' : 'tabs'} role="tablist">
      {tabs.map((t) => {
        const on = t.value === value
        const cls =
          variant === 'segmented'
            ? `seg-btn${on ? ' active' : ''}`
            : `tab${on ? ' active' : ''}`
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={on}
            className={cls}
            onClick={() => onChange(t.value)}
          >
            {t.icon}
            {t.label}
            {t.count != null && <span className="tab-count mono">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Stat / KPI ---------- */
export function Stat({
  value,
  label,
  icon,
  hint,
  size = 'md',
}: {
  value: ReactNode
  label: ReactNode
  icon?: ReactNode
  hint?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div className={`stat stat-${size}`}>
      {icon && <span className="stat-icon">{icon}</span>}
      <span className="stat-value mono">{value}</span>
      <span className="stat-label">{label}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}

/* ---------- Form field + inputs ---------- */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className ?? ''}`.trim()} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input ${className ?? ''}`.trim()} {...rest} />
}

/* ---------- Empty state ---------- */
export function EmptyState({
  message,
  hint,
  icon,
  action,
}: {
  message: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-orbit">{icon ?? <Sparkles size={22} strokeWidth={1.75} />}</span>
      <span className="empty-title">{message}</span>
      {hint && <span className="empty-hint">{hint}</span>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}

/* ---------- Skeleton (loading) ---------- */
export function Skeleton({
  w,
  h = 14,
  radius,
  className,
}: {
  w?: number | string
  h?: number | string
  radius?: number | string
  className?: string
}) {
  return (
    <span
      className={`skeleton ${className ?? ''}`.trim()}
      style={{ width: w ?? '100%', height: h, borderRadius: radius ?? 'var(--radius-sm)' }}
    />
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} w={i === lines - 1 ? '60%' : '100%'} h={12} />
      ))}
    </div>
  )
}

/* ---------- Toasts ---------- */
type ToastKind = 'info' | 'success' | 'error'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}
interface ToastApi {
  show: (message: string, kind?: ToastKind) => void
}
const ToastCtx = createContext<ToastApi | null>(null)
let toastSeq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++toastSeq
    setToasts((prev) => [...prev, { id, kind, message }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])
  const api = useMemo(() => ({ show }), [show])
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.kind === 'success' ? (
              <CheckCircle2 size={15} />
            ) : t.kind === 'error' ? (
              <AlertTriangle size={15} />
            ) : (
              <Info size={15} />
            )}
            <span>{t.message}</span>
            <button
              className="icon-btn"
              aria-label="Dismiss"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  return useContext(ToastCtx) ?? { show: () => {} }
}

/* ---------- Confirm dialog (themed replacement for window.confirm) ---------- */
interface ConfirmOpts {
  title?: string
  message: string
  confirmLabel?: string
  danger?: boolean
}
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(() => Promise.resolve(false))

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve })),
    [],
  )
  const close = (val: boolean) => {
    setState((cur) => {
      cur?.resolve(val)
      return null
    })
  }
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <Modal
          title={state.title ?? 'Are you sure?'}
          onClose={() => close(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button variant={state.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
                {state.confirmLabel ?? 'Confirm'}
              </Button>
            </>
          }
        >
          <p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{state.message}</p>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmCtx)
}

/* ---------- Dropdown menu (account, row overflow, bell panel) ---------- */
export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  panelClassName,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="dropdown-trigger" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        {trigger}
      </button>
      {open && (
        <div className={`dropdown-panel ${align}${panelClassName ? ` ${panelClassName}` : ''}`} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ---------- Hook: lock body scroll + Esc handler (for overlays) ---------- */
export function useDismissable(onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])
}
