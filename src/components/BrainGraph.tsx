import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * A hand-rolled force-directed graph (no charting library). A velocity-free
 * Verlet-ish simulation (charge repulsion + link springs + centering) settles
 * over a bounded, cooling loop, then auto-fits the view to the laid-out graph.
 * Interactions: wheel-zoom, background-drag to pan, node-drag to reposition,
 * click a node to act, hover to highlight a node and its edges.
 *
 * Type-agnostic: callers pass nodes with an explicit colour + radius, mark which
 * deserve a persistent label (`big`), and may pass cross-cluster `bridge` edges.
 */

export interface VizNode {
  id: string
  label: string
  color: string
  r: number
  /** Eligible for a persistent label (others label on hover only). */
  big?: boolean
  done?: boolean
  route?: string
}

export interface VizEdge {
  source: string
  target: string
  kind?: 'normal' | 'link' | 'bridge'
}

interface P {
  x: number
  y: number
  pinned: boolean
}

const CENTER = 0.012
const COOL = 0.985
const MIN_ALPHA = 0.02
const LABEL_ZOOM = 0.5 // big-node labels appear once the view is at least this zoomed

export function BrainGraph({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: VizNode[]
  edges: VizEdge[]
  onNodeClick: (node: VizNode) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pos = useRef<Map<string, P>>(new Map())
  const alpha = useRef(1)
  const raf = useRef<number | null>(null)
  const size = useRef({ w: 800, h: 560 })
  const needsFit = useRef(true)
  const interacted = useRef(false)
  const [, setFrame] = useState(0)
  const [view, setView] = useState({ tx: 400, ty: 280, k: 1 })
  const [hover, setHover] = useState<string | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  // Deterministic phyllotaxis seed so layouts don't jitter between renders.
  const seed = useCallback((i: number): { x: number; y: number } => {
    const a = i * 2.399963 // golden angle
    const r = 16 * Math.sqrt(i + 1)
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  }, [])

  // Sync the position map with the current node set (add new, drop gone).
  useEffect(() => {
    const next = new Map<string, P>()
    nodes.forEach((n, i) => {
      next.set(n.id, pos.current.get(n.id) ?? { ...seed(i), pinned: false })
    })
    pos.current = next
    alpha.current = 1 // reheat for the new set
    needsFit.current = true
    interacted.current = false
  }, [nodes, seed])

  // The cooling simulation loop.
  useEffect(() => {
    // Spread scales with the node count so dense graphs don't clump in the centre.
    const n = nodes.length || 1
    const repulse = 1800 + Math.min(5000, n * 45)
    const linkLen = 84 + Math.min(80, n * 0.5)
    const maxRepDist2 = 180000

    const tick = (): void => {
      const ps = pos.current
      const a = alpha.current
      const disp = new Map<string, { x: number; y: number }>()
      for (const id of ps.keys()) disp.set(id, { x: 0, y: 0 })

      // Charge repulsion (O(n²); the backbone is bounded and capped server-side).
      const ids = [...ps.keys()]
      for (let i = 0; i < ids.length; i++) {
        const pi = ps.get(ids[i])!
        const di = disp.get(ids[i])!
        for (let j = i + 1; j < ids.length; j++) {
          const pj = ps.get(ids[j])!
          let dx = pi.x - pj.x
          let dy = pi.y - pj.y
          let d2 = dx * dx + dy * dy
          if (d2 > maxRepDist2) continue // ignore far pairs
          if (d2 < 0.01) {
            dx = (i - j) * 0.1 + 0.1
            dy = 0.1
            d2 = 0.02
          }
          const f = repulse / d2
          const d = Math.sqrt(d2)
          const ux = (dx / d) * f
          const uy = (dy / d) * f
          di.x += ux
          di.y += uy
          const dj = disp.get(ids[j])!
          dj.x -= ux
          dj.y -= uy
        }
      }
      // Link springs.
      for (const e of edges) {
        const a1 = ps.get(e.source)
        const b1 = ps.get(e.target)
        if (!a1 || !b1) continue
        const dx = b1.x - a1.x
        const dy = b1.y - a1.y
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01
        const diff = ((d - linkLen) / d) * 0.04
        const da = disp.get(e.source)!
        const db = disp.get(e.target)!
        da.x += dx * diff
        da.y += dy * diff
        db.x -= dx * diff
        db.y -= dy * diff
      }
      // Centering + integrate.
      for (const [id, p] of ps) {
        if (p.pinned) continue
        const d = disp.get(id)!
        d.x += -p.x * CENTER
        d.y += -p.y * CENTER
        p.x += Math.max(-30, Math.min(30, d.x * a))
        p.y += Math.max(-30, Math.min(30, d.y * a))
      }
      alpha.current *= COOL

      // Once settled, fit the whole graph into the viewport (unless the user took over).
      if (needsFit.current && !interacted.current && alpha.current < 0.25) {
        needsFit.current = false
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const p of ps.values()) {
          if (p.x < minX) minX = p.x
          if (p.y < minY) minY = p.y
          if (p.x > maxX) maxX = p.x
          if (p.y > maxY) maxY = p.y
        }
        if (Number.isFinite(minX)) {
          const { w, h } = size.current
          const pad = 80
          const gw = Math.max(1, maxX - minX)
          const gh = Math.max(1, maxY - minY)
          const k = Math.max(0.25, Math.min(1.6, Math.min((w - pad * 2) / gw, (h - pad * 2) / gh)))
          const cx = (minX + maxX) / 2
          const cy = (minY + maxY) / 2
          setView({ k, tx: w / 2 - cx * k, ty: h / 2 - cy * k })
        }
      }

      setFrame((f) => f + 1)
      if (alpha.current > MIN_ALPHA) raf.current = requestAnimationFrame(tick)
      else raf.current = null
    }
    if (raf.current == null) raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
      raf.current = null
    }
  }, [nodes, edges])

  const reheat = useCallback((to = 0.3): void => {
    alpha.current = Math.max(alpha.current, to)
    if (raf.current == null) setFrame((f) => f + 1)
  }, [])

  // Measure the canvas on mount / resize (the simulation handles centring via fit).
  useLayoutEffect(() => {
    const measure = (): void => {
      const el = wrapRef.current
      if (!el) return
      size.current = { w: el.clientWidth, h: el.clientHeight }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  // ---- pointer interactions ----
  const drag = useRef<{
    mode: 'none' | 'pan' | 'node'
    id?: string
    sx: number
    sy: number
    moved: boolean
  }>({ mode: 'none', sx: 0, sy: 0, moved: false })

  const toGraph = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = svgRef.current?.getBoundingClientRect()
    const v = viewRef.current
    const px = clientX - (rect?.left ?? 0)
    const py = clientY - (rect?.top ?? 0)
    return { x: (px - v.tx) / v.k, y: (py - v.ty) / v.k }
  }

  const capture = (id: number): void => {
    try {
      svgRef.current?.setPointerCapture(id)
    } catch {
      // some pointers aren't capturable (e.g. synthetic events) — harmless
    }
  }
  const onNodeDown = (e: React.PointerEvent, id: string): void => {
    e.stopPropagation()
    capture(e.pointerId)
    drag.current = { mode: 'node', id, sx: e.clientX, sy: e.clientY, moved: false }
    const p = pos.current.get(id)
    if (p) p.pinned = true
  }
  const onBgDown = (e: React.PointerEvent): void => {
    capture(e.pointerId)
    drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, moved: false }
  }
  const onMove = (e: React.PointerEvent): void => {
    const d = drag.current
    if (d.mode === 'none') return
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true
    if (d.mode === 'pan') {
      interacted.current = true
      setView((v) => ({ ...v, tx: v.tx + e.movementX, ty: v.ty + e.movementY }))
    } else if (d.mode === 'node' && d.id) {
      interacted.current = true
      const g = toGraph(e.clientX, e.clientY)
      const p = pos.current.get(d.id)
      if (p) {
        p.x = g.x
        p.y = g.y
        setFrame((f) => f + 1)
      }
    }
  }
  const onUp = (e: React.PointerEvent): void => {
    const d = drag.current
    if (d.mode === 'node' && d.id) {
      const p = pos.current.get(d.id)
      if (p) p.pinned = false
      if (!d.moved) {
        const node = nodes.find((n) => n.id === d.id)
        if (node) onNodeClick(node)
      } else {
        reheat(0.2)
      }
    }
    drag.current = { mode: 'none', sx: 0, sy: 0, moved: false }
    try {
      svgRef.current?.releasePointerCapture?.(e.pointerId)
    } catch {
      // ignore — pointer may not have been captured
    }
  }
  const onWheel = (e: React.WheelEvent): void => {
    interacted.current = true
    const rect = svgRef.current?.getBoundingClientRect()
    const px = e.clientX - (rect?.left ?? 0)
    const py = e.clientY - (rect?.top ?? 0)
    setView((v) => {
      const k = Math.max(0.2, Math.min(3, v.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
      const tx = px - ((px - v.tx) / v.k) * k
      const ty = py - ((py - v.ty) / v.k) * k
      return { tx, ty, k }
    })
  }

  // Highlight set: the hovered node and its direct neighbours.
  const neighbors = new Set<string>()
  if (hover) {
    neighbors.add(hover)
    for (const e of edges) {
      if (e.source === hover) neighbors.add(e.target)
      if (e.target === hover) neighbors.add(e.source)
    }
  }

  const ps = pos.current
  return (
    <div className="graph-canvas" ref={wrapRef}>
      <svg
        ref={svgRef}
        className="graph-svg"
        width="100%"
        height="100%"
        onPointerDown={onBgDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onWheel={onWheel}
      >
        <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
          {edges.map((e, i) => {
            const a = ps.get(e.source)
            const b = ps.get(e.target)
            if (!a || !b) return null
            const active = hover != null && (e.source === hover || e.target === hover)
            const kind = e.kind === 'link' ? ' edge-link' : e.kind === 'bridge' ? ' edge-bridge' : ''
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`graph-edge${active ? ' active' : ''}${kind}`}
              />
            )
          })}
          {nodes.map((n) => {
            const p = ps.get(n.id)
            if (!p) return null
            const isHover = n.id === hover
            const dim = hover != null && !neighbors.has(n.id)
            const showLabel = isHover || neighbors.has(n.id) || (!!n.big && view.k >= LABEL_ZOOM)
            return (
              <g
                key={n.id}
                className={`graph-node${dim ? ' dim' : ''}${n.done ? ' done' : ''}`}
                transform={`translate(${p.x},${p.y})`}
                onPointerDown={(e) => onNodeDown(e, n.id)}
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
              >
                <circle r={isHover ? n.r + 2 : n.r} fill={n.color} className="graph-dot" />
                {showLabel && (
                  <text x={n.r + 4} y={4} className={`graph-label${n.big ? ' lane' : ''}`}>
                    {n.label}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
