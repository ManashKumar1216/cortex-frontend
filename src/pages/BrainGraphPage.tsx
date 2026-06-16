import { useMemo, useState } from 'react'

import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { areas } from '../api/hooks'
import { useGraph } from '../api/graph'
import { AreaSelect } from '../components/selects'
import { BrainGraph, type VizNode } from '../components/BrainGraph'
import { EmptyState, PageHeader } from '../components/ui'
import type { GraphNodeType } from '../lib/types'

const TYPES: { type: GraphNodeType; label: string; r: number }[] = [
  { type: 'area', label: 'Areas', r: 7 },
  { type: 'goal', label: 'Goals', r: 6 },
  { type: 'project', label: 'Projects', r: 5 },
  { type: 'task', label: 'Tasks', r: 4 },
  { type: 'habit', label: 'Habits', r: 5 },
  { type: 'journal', label: 'Journal', r: 4 },
  { type: 'note', label: 'Notes', r: 4 },
]

// Render radius + fallback colour per node type (areas are the structural anchors).
const TYPE_R: Record<GraphNodeType, number> = {
  area: 12,
  goal: 9,
  project: 7,
  habit: 6,
  task: 5,
  journal: 5,
  note: 5,
}
const TYPE_COLOR: Record<GraphNodeType, string> = {
  area: '#e8d6a8',
  goal: '#d9b871',
  project: '#8faec4',
  habit: '#d98a7e',
  task: '#7fb0a0',
  journal: '#989aa2',
  note: '#6a6c74',
}

export function BrainGraphPage() {
  const graph = useGraph()
  const areaList = areas.useList()
  const navigate = useNavigate()

  const [enabled, setEnabled] = useState<Record<GraphNodeType, boolean>>({
    area: true,
    goal: true,
    project: true,
    task: true,
    habit: true,
    journal: true,
    note: true,
  })
  const [areaFilter, setAreaFilter] = useState('')
  const [search, setSearch] = useState('')

  // The set of areas in the selected lane's family (lane itself + its sub-areas).
  const areaFamily = useMemo(() => {
    if (!areaFilter) return null
    const list = areaList.data ?? []
    const fam = new Set<string>([areaFilter])
    for (const a of list) if (a.parentId && String(a.parentId) === areaFilter) fam.add(a.id)
    return fam
  }, [areaFilter, areaList.data])

  const { nodes, edges } = useMemo(() => {
    const all = graph.data?.nodes ?? []
    const q = search.trim().toLowerCase()
    const visible = all.filter((n) => {
      if (!enabled[n.type]) return false
      if (areaFamily) {
        const own = n.type === 'area' ? n.id.replace(/^area:/, '') : n.areaId
        if (!own || !areaFamily.has(own)) return false
      }
      if (q && !n.label.toLowerCase().includes(q)) return false
      return true
    })
    const ids = new Set(visible.map((n) => n.id))
    const visEdges = (graph.data?.edges ?? []).filter((e) => ids.has(e.source) && ids.has(e.target))
    return { nodes: visible, edges: visEdges }
  }, [graph.data, enabled, areaFamily, search])

  // Map the typed graph nodes/edges to the renderer's generic shape.
  const vizNodes = useMemo<VizNode[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        label: n.label,
        color: n.color ?? TYPE_COLOR[n.type],
        r: TYPE_R[n.type],
        big: n.type === 'area',
        done: n.done,
        route: n.route,
      })),
    [nodes],
  )
  const vizEdges = useMemo(
    () => edges.map((e) => ({ source: e.source, target: e.target, kind: e.type === 'link' ? ('link' as const) : ('normal' as const) })),
    [edges],
  )

  const counts = graph.data?.counts
  const total = graph.data?.nodes.length ?? 0
  const toggle = (t: GraphNodeType): void => setEnabled((s) => ({ ...s, [t]: !s[t] }))
  const onNodeClick = (n: VizNode): void => {
    if (n.route) navigate(n.route)
  }

  return (
    <div className="graph-page">
      <PageHeader
        title="Brain Graph"
        subtitle="How your areas, goals, projects, tasks, habits, journal and notes connect"
      />

      <div className="graph-controls">
        <div className="graph-types">
          {TYPES.map((t) => (
            <button
              key={t.type}
              className={`chip graph-type-chip${enabled[t.type] ? ' active' : ''}`}
              onClick={() => toggle(t.type)}
              title={`Toggle ${t.label}`}
            >
              <span className="graph-type-dot" style={{ width: t.r * 2, height: t.r * 2 }} />
              {t.label}
              {counts ? <span className="muted"> {counts[t.type]}</span> : null}
            </button>
          ))}
        </div>
        <div className="graph-filters">
          <div className="graph-search">
            <Search size={14} />
            <input
              className="input"
              placeholder="Find a node…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <AreaSelect value={areaFilter} onChange={setAreaFilter} emptyLabel="— All areas —" />
        </div>
      </div>

      <p className="muted small graph-caption">
        Colour follows each item's life-area; size follows its type. Drag to pan, scroll to zoom,
        drag a node to move it, click a node to open it.
        {graph.data?.truncated ? ' Some high-volume items are capped — filter to narrow.' : ''}
      </p>

      {graph.isPending && <p className="muted">Building your graph…</p>}
      {graph.data && total === 0 && (
        <EmptyState
          message="Nothing to graph yet."
          hint="Add a few areas, goals, projects or tasks and they'll appear here, wired together."
        />
      )}
      {graph.data && total > 0 && nodes.length === 0 && (
        <EmptyState message="No nodes match these filters." hint="Re-enable a type or clear the search/area filter." />
      )}
      {graph.data && nodes.length > 0 && (
        <BrainGraph nodes={vizNodes} edges={vizEdges} onNodeClick={onNodeClick} />
      )}
    </div>
  )
}
