import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'

import { Download, Save, Upload } from 'lucide-react'

import { useQueryClient } from '@tanstack/react-query'

import { downloadBackup, useImportBackup } from '../api/backup'
import {
  useSettings,
  useSettingsMeta,
  usePatchSettings,
  type SettingField,
} from '../api/settings'
import { PageHeader, useToast } from '../components/ui'

type Draft = Record<string, string | number | boolean>

/** Order groups deliberately; any unlisted group falls to the end alphabetically. */
const GROUP_ORDER = [
  'Display',
  'Model & Retrieval',
  'Proactivity',
  'Notifications',
  'Web search',
  'News',
  'Budget',
  'Channels',
  'Features',
]

export function SettingsPage() {
  const meta = useSettingsMeta()
  const settings = useSettings()
  const patch = usePatchSettings()
  const toast = useToast()

  // Local edits keyed by field; only changed fields are sent on save.
  const [draft, setDraft] = useState<Draft>({})
  const [secretDraft, setSecretDraft] = useState<Record<string, string>>({})
  const [activeSection, setActiveSection] = useState('')

  const groups = useMemo(() => {
    const fields = meta.data ?? []
    const byGroup = new Map<string, SettingField[]>()
    for (const f of fields) {
      if (!byGroup.has(f.group)) byGroup.set(f.group, [])
      byGroup.get(f.group)!.push(f)
    }
    return [...byGroup.entries()].sort(
      (a, b) => groupRank(a[0]) - groupRank(b[0]) || a[0].localeCompare(b[0]),
    )
  }, [meta.data])

  // The right-rail jump list: one entry per group, plus the Data/backup section.
  const railSections = useMemo(
    () => [...groups.map(([g]) => ({ id: slugifyGroup(g), label: g })), { id: 'data', label: 'Data' }],
    [groups],
  )

  // Deep links from the Setup guide (/settings#web-search) scroll to their group.
  // Wait for BOTH queries — the groups only render once meta AND settings load —
  // then scroll on the next frame so layout is settled.
  useEffect(() => {
    if (!meta.data || !settings.data) return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const id = requestAnimationFrame(() =>
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
    return () => cancelAnimationFrame(id)
  }, [meta.data, settings.data])

  // Scroll-spy: highlight the section currently under a reading line just below
  // the sticky topbar. The page itself scrolls (the sidebar is sticky), so we
  // track window scroll. Two edge cases the naive "nearest to top" approach got
  // wrong: a tall section you've mostly scrolled PAST would win over the one
  // actually filling the view, and the last (short) section can never reach the
  // top — so at the very bottom we force it active.
  useEffect(() => {
    if (!meta.data || !settings.data) return
    const ids = railSections.map((s) => s.id)
    if (!ids.length) return

    let frame = 0

    const pick = (): void => {
      frame = 0
      const doc = document.documentElement
      // At the bottom of the page the last section is the active one, even if
      // it never crosses the reading line.
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
        setActiveSection(ids[ids.length - 1]!)
        return
      }
      // Otherwise: the last section whose heading has scrolled above the reading
      // line (~a third down the viewport, so it tracks the section in view
      // rather than lagging on the one whose tail is still near the very top).
      const line = window.innerHeight * 0.33
      let active = ids[0]!
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top - line <= 0) active = id
      }
      setActiveSection(active)
    }

    const onScroll = (): void => {
      if (frame) return
      frame = requestAnimationFrame(pick)
    }

    pick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.data, settings.data, railSections])

  if (meta.isPending || settings.isPending) return <p className="muted">Loading…</p>
  if (meta.isError || settings.isError) return <p className="error">Failed to load settings.</p>

  const values = settings.data!.values
  const secretsSet = settings.data!.secretsSet

  const current = (f: SettingField): string | number | boolean =>
    f.key in draft ? draft[f.key]! : (values[f.key] ?? '')

  const dirtyKeys = [
    ...Object.keys(draft).filter((k) => draft[k] !== values[k]),
    ...Object.keys(secretDraft).filter((k) => secretDraft[k] !== ''),
  ]
  const dirty = dirtyKeys.length > 0

  const setField = (key: string, val: string | number | boolean): void =>
    setDraft((d) => ({ ...d, [key]: val }))

  const save = (): void => {
    const body: Record<string, unknown> = {}
    for (const k of Object.keys(draft)) if (draft[k] !== values[k]) body[k] = draft[k]
    for (const k of Object.keys(secretDraft)) if (secretDraft[k] !== '') body[k] = secretDraft[k]
    patch.mutate(body, {
      onSuccess: () => {
        setDraft({})
        setSecretDraft({})
        toast.show('Settings saved')
      },
      onError: (e) => toast.show((e as Error).message, 'error'),
    })
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure Cortex in-app — model, retrieval, proactivity, integrations & more"
        action={
          <button className="btn primary sm" onClick={save} disabled={!dirty || patch.isPending}>
            <Save size={14} /> {patch.isPending ? 'Saving…' : dirty ? `Save (${dirtyKeys.length})` : 'Saved'}
          </button>
        }
      />

      <div className="settings-layout">
        <div className="settings-main">
      {groups.map(([group, fields]) => (
        <section key={group} id={slugifyGroup(group)} className="card settings-group">
          <h2 className="settings-group-title">{group}</h2>
          <div className="settings-grid">
            {fields.map((f) => (
              <div key={f.key} className="settings-row">
                <div className="settings-label">
                  <label htmlFor={`set-${f.key}`}>{f.label}</label>
                  {!f.live && <span className="settings-badge" title="Applies after a restart">restart</span>}
                  {f.help && <span className="muted small settings-help">{f.help}</span>}
                </div>
                <div className="settings-control">
                  <FieldControl
                    field={f}
                    value={current(f)}
                    secretSet={secretsSet[f.key]}
                    secretDraft={secretDraft[f.key] ?? ''}
                    onChange={(v) => setField(f.key, v)}
                    onSecretChange={(v) => setSecretDraft((s) => ({ ...s, [f.key]: v }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <BackupSection />

      <p className="muted small settings-foot">
        Secrets are stored encrypted on this machine and never shown again. Email & WhatsApp accounts
        are managed on their own pages.
      </p>
        </div>

        <nav className="settings-rail" aria-label="Settings sections">
          <span className="settings-rail-title">On this page</span>
          {railSections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={activeSection === s.id ? 'active' : ''}
              onClick={() => {
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                setActiveSection(s.id)
              }}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function BackupSection() {
  const toast = useToast()
  const qc = useQueryClient()
  const importMut = useImportBackup()
  const fileRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)

  const doExport = async (): Promise<void> => {
    setExporting(true)
    try {
      await downloadBackup()
      toast.show('Backup downloaded')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result)) as { collections?: Record<string, unknown[]> }
        importMut.mutate(payload, {
          onSuccess: (r) => {
            toast.show(r.total > 0 ? `Imported ${r.total} item(s)` : 'Nothing new to import')
            void qc.invalidateQueries()
          },
          onError: (err) => toast.show((err as Error).message, 'error'),
        })
      } catch {
        toast.show('That file is not a valid Cortex backup', 'error')
      }
    }
    reader.readAsText(file)
  }

  return (
    <section id="data" className="card settings-group">
      <h2 className="settings-group-title">Data</h2>
      <p className="muted small" style={{ marginTop: '-6px', marginBottom: '12px' }}>
        Export a JSON snapshot of your areas, goals, projects, tasks, habits, journal, notes, reminders,
        resources, transactions, skills & local calendar events. Import is additive — it never overwrites.
      </p>
      <div className="settings-data-actions">
        <button className="btn ghost sm" onClick={() => void doExport()} disabled={exporting}>
          <Download size={14} /> {exporting ? 'Exporting…' : 'Export backup'}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onFile} />
        <button className="btn ghost sm" onClick={() => fileRef.current?.click()} disabled={importMut.isPending}>
          <Upload size={14} /> {importMut.isPending ? 'Importing…' : 'Import backup'}
        </button>
      </div>
    </section>
  )
}

function groupRank(group: string): number {
  const i = GROUP_ORDER.indexOf(group)
  return i === -1 ? GROUP_ORDER.length : i
}

/** "Model & Retrieval" → "model-retrieval" — the #anchor the Setup guide links to. */
function slugifyGroup(group: string): string {
  return group
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function FieldControl({
  field,
  value,
  secretSet,
  secretDraft,
  onChange,
  onSecretChange,
}: {
  field: SettingField
  value: string | number | boolean
  secretSet?: boolean
  secretDraft: string
  onChange: (v: string | number | boolean) => void
  onSecretChange: (v: string) => void
}) {
  if (field.kind === 'boolean') {
    return (
      <label className="settings-toggle">
        <input
          id={`set-${field.key}`}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{value ? 'On' : 'Off'}</span>
      </label>
    )
  }
  if (field.kind === 'enum') {
    return (
      <select
        id={`set-${field.key}`}
        className="input sm"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  if (field.kind === 'secret') {
    return (
      <input
        id={`set-${field.key}`}
        className="input sm"
        type="password"
        value={secretDraft}
        placeholder={secretSet ? '•••••••• (set — type to replace)' : 'not set'}
        onChange={(e) => onSecretChange(e.target.value)}
      />
    )
  }
  if (field.kind === 'number') {
    return (
      <input
        id={`set-${field.key}`}
        className="input sm"
        type="number"
        min={field.min}
        max={field.max}
        step={field.max != null && field.max <= 1 ? 0.05 : 1}
        value={Number(value)}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    )
  }
  return (
    <input
      id={`set-${field.key}`}
      className="input sm"
      type="text"
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
