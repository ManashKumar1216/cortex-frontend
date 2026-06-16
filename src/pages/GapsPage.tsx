import { useMemo } from 'react'

import { Radar, Sparkles } from 'lucide-react'

import { useKnowledgeGapGraph, useScanKnowledgeGaps } from '../api/memory'
import { BrainGraph, type VizEdge, type VizNode } from '../components/BrainGraph'
import { Badge, Button, Card, EmptyState, PageHeader, useToast } from '../components/ui'

// A distinct, theme-friendly colour per detected cluster (cycled).
const CLUSTER_COLORS = [
  '#e8d6a8', '#8faec4', '#7fb0a0', '#d98a7e', '#d9b871', '#a9c48f',
  '#c49ad9', '#7ea0c4', '#d9a86f', '#8fc4b8', '#c4879a', '#9a9ad9',
]
const clusterColor = (id: number): string => CLUSTER_COLORS[((id % CLUSTER_COLORS.length) + CLUSTER_COLORS.length) % CLUSTER_COLORS.length]!

export function GapsPage() {
  const radar = useKnowledgeGapGraph()
  const scan = useScanKnowledgeGaps()
  const toast = useToast()
  const data = radar.data

  // Map clusters → graph: nodes coloured by cluster, intra-cluster star edges so
  // each topic clumps, and dashed accent "bridge" edges across each detected gap.
  const { vizNodes, vizEdges } = useMemo(() => {
    if (!data) return { vizNodes: [] as VizNode[], vizEdges: [] as VizEdge[] }
    const repByCluster = new Map<number, string>()
    for (const n of data.nodes) if (n.rep) repByCluster.set(n.cluster, n.id)

    const vNodes: VizNode[] = data.nodes.map((n) => ({
      id: n.id,
      label: n.title || '(untitled)',
      color: clusterColor(n.cluster),
      r: n.rep ? 8 : 5,
      big: n.rep,
    }))

    const vEdges: VizEdge[] = []
    for (const n of data.nodes) {
      if (n.rep) continue
      const rep = repByCluster.get(n.cluster)
      if (rep) vEdges.push({ source: n.id, target: rep, kind: 'normal' })
    }
    for (const g of data.gaps) {
      const a = repByCluster.get(g.a)
      const b = repByCluster.get(g.b)
      if (a && b) vEdges.push({ source: a, target: b, kind: 'bridge' })
    }
    return { vizNodes: vNodes, vizEdges: vEdges }
  }, [data])

  const runNow = () => {
    scan.mutate(undefined, {
      onSuccess: (r) =>
        toast.show(r.gaps > 0 ? `Found ${r.gaps} connection${r.gaps === 1 ? '' : 's'} to explore.` : 'No new connections right now.', 'success'),
      onError: (e) => toast.show((e as Error).message, 'error'),
    })
  }

  const header = (
    <PageHeader
      title="Knowledge Gaps"
      subtitle="Topics that look related but aren't linked yet — and questions that bridge them"
      action={
        <Button variant="primary" size="sm" icon={<Sparkles size={14} />} loading={scan.isPending} onClick={runNow}>
          Run radar now
        </Button>
      }
    />
  )

  if (radar.isPending) return <div>{header}<p className="muted">Scanning your brain…</p></div>
  if (radar.isError) return <div>{header}<p className="error">{(radar.error as Error).message}</p></div>
  if (!data) return <div>{header}</div>

  if (!data.enabled) {
    return (
      <div>
        {header}
        <EmptyState message="The knowledge-gap radar is off." hint="Set GAP_RADAR_ENABLED=true to surface unexplored connections." />
      </div>
    )
  }
  if (data.nodeCount < data.minNodes) {
    return (
      <div>
        {header}
        <EmptyState
          message="Not enough to scan yet."
          hint={`The radar needs at least ${data.minNodes} concept items (notes, journal, goals, projects…). You have ${data.nodeCount}.`}
        />
      </div>
    )
  }
  if (vizNodes.length === 0) {
    return (
      <div>
        {header}
        <EmptyState message="No topic clusters yet." hint="As related notes and ideas accumulate, the radar will group them here." />
      </div>
    )
  }

  return (
    <div className="graph-page gaps-page">
      {header}

      <p className="muted small graph-caption">
        Dots are your notes &amp; ideas, coloured by topic cluster. Dashed lines are <strong>bridges</strong> —
        clusters that read as related but aren't connected in your brain graph. Drag to pan, scroll to zoom.
      </p>

      <div className="gaps-layout">
        <BrainGraph nodes={vizNodes} edges={vizEdges} onNodeClick={() => undefined} />

        <aside className="gaps-side">
          <h2 className="skill-section-title">
            <Radar size={14} /> Bridges {data.gaps.length ? <span className="muted">({data.gaps.length})</span> : null}
          </h2>
          {data.gaps.length === 0 && (
            <p className="muted small">No unexplored connections right now — your related topics are already linked. Add more notes, or check back later.</p>
          )}
          {data.gaps.map((g, i) => (
            <Card key={i} className="gap-card">
              <div className="gap-card-clusters">
                <span className="gap-swatch" style={{ background: clusterColor(g.a) }} />
                <span className="muted small">{g.titlesA.join(', ')}</span>
              </div>
              <div className="gap-card-clusters">
                <span className="gap-swatch" style={{ background: clusterColor(g.b) }} />
                <span className="muted small">{g.titlesB.join(', ')}</span>
              </div>
              {g.question ? (
                <p className="gap-question">{g.question}</p>
              ) : (
                <p className="muted small gap-unphrased">Run the radar to phrase a bridging question.</p>
              )}
              <Badge kind="muted">{Math.round(g.sim * 100)}% related</Badge>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  )
}
