import { useMemo, useState } from 'react'

import { Search } from 'lucide-react'

import { useToolCatalog, type ToolMeta } from '../api/skills'

/** Human labels for tool groups (falls back to the raw group key). */
const GROUP_LABEL: Record<string, string> = {
  memory: 'Memory',
  today: 'Today & Calendar',
  task: 'Tasks',
  project: 'Projects',
  goal: 'Goals',
  area: 'Areas',
  habit: 'Habits',
  journal: 'Journal',
  note: 'Notes',
  resource: 'Resources',
  reminder: 'Reminders',
  web: 'Web',
  email: 'Email',
  budget: 'Budget',
}

/**
 * Grouped, searchable checklist of agent tools for a skill's allowed set.
 * `search_memory` is always available to the agent, so it's shown pinned, not
 * selectable. Writes still pass through the confirm-before-write gate.
 */
export function ToolPicker({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  const { data, isPending, isError } = useToolCatalog()
  const [q, setQ] = useState('')
  const sel = useMemo(() => new Set(selected), [selected])

  const groups = useMemo(() => {
    const tools = (data ?? []).filter((t) => t.name !== 'search_memory')
    const f = q.trim().toLowerCase()
    const filtered = f
      ? tools.filter((t) => t.name.includes(f) || t.description.toLowerCase().includes(f))
      : tools
    const m = new Map<string, ToolMeta[]>()
    for (const t of filtered) {
      const arr = m.get(t.group) ?? []
      arr.push(t)
      m.set(t.group, arr)
    }
    return [...m.entries()].sort((a, b) =>
      (GROUP_LABEL[a[0]] ?? a[0]).localeCompare(GROUP_LABEL[b[0]] ?? b[0]),
    )
  }, [data, q])

  const toggle = (name: string) => {
    const next = new Set(sel)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange([...next])
  }

  return (
    <div className="tool-picker">
      <div className="tool-picker-bar">
        <span className="tool-picker-search">
          <Search size={13} />
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tools…"
          />
        </span>
        <span className="muted small">{selected.length} selected</span>
      </div>

      {isPending && <p className="muted small">Loading tools…</p>}
      {isError && <p className="error small">Couldn’t load the tool list.</p>}

      <div className="tool-picker-groups">
        {groups.map(([group, tools]) => (
          <div key={group} className="tool-picker-group">
            <p className="tool-picker-group-title">{GROUP_LABEL[group] ?? group}</p>
            {tools.map((t) => (
              <label key={t.name} className={`tool-row${sel.has(t.name) ? ' on' : ''}`}>
                <input type="checkbox" checked={sel.has(t.name)} onChange={() => toggle(t.name)} />
                <span className="tool-row-main">
                  <span className="tool-row-head">
                    <code className="tool-row-name">{t.name}</code>
                    <span className={`tool-tag ${t.kind}`}>{t.kind}</span>
                    {t.networked && <span className="tool-tag net">web</span>}
                  </span>
                  <span className="tool-row-desc muted small">{t.description}</span>
                </span>
              </label>
            ))}
          </div>
        ))}
        {!isPending && groups.length === 0 && <p className="muted small">No tools match “{q}”.</p>}
      </div>

      <p className="muted small tool-picker-foot">
        <code>search_memory</code> is always available. Write tools still ask for your approval before running.
      </p>
    </div>
  )
}
