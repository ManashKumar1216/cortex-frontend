import { useMemo, useRef, useState, type ChangeEvent } from 'react'

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
  'Model & Retrieval',
  'Proactivity',
  'Notifications',
  'Web search',
  'News',
  'Budget',
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

      {groups.map(([group, fields]) => (
        <section key={group} className="card settings-group">
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
    <section className="card settings-group">
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
