interface Day {
  date: string // YYYY-MM-DD
  count: number
}

const CELL = 15
const GAP = 4
const STEP = CELL + GAP
const LEFT = 34 // room for weekday labels
const TOP = 22 // room for month labels
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_LABELS: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' }

// 0 = no activity (a visible empty square, GitHub-style); 1–4 ramp the warm accent.
const SHADES = [
  'var(--surface-3)',
  'rgba(232, 214, 168, 0.3)',
  'rgba(232, 214, 168, 0.52)',
  'rgba(232, 214, 168, 0.74)',
  'var(--accent)',
]

function levelOf(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0
  const r = count / max
  if (r < 0.25) return 1
  if (r < 0.5) return 2
  if (r < 0.75) return 3
  return 4
}

/**
 * A hand-rolled GitHub-style activity heatmap (no charting lib). Columns are
 * weeks (Sun→Sat rows); each cell shades by that day's total activity.
 */
export function ActivityHeatmap({ days, max }: { days: Day[]; max: number }) {
  if (days.length === 0) return <p className="muted small">No activity yet.</p>

  const wd0 = new Date(`${days[0].date}T00:00:00`).getDay() // 0=Sun
  const totalSlots = wd0 + days.length
  const cols = Math.ceil(totalSlots / 7)
  const width = LEFT + cols * STEP
  const height = TOP + 7 * STEP

  // Month labels: first column where each month first appears.
  const monthLabels: { x: number; label: string }[] = []
  let lastMonth = ''
  days.forEach((d, i) => {
    const col = Math.floor((wd0 + i) / 7)
    const m = d.date.slice(5, 7)
    if (m !== lastMonth) {
      lastMonth = m
      monthLabels.push({ x: LEFT + col * STEP, label: MONTHS[Number(m) - 1] })
    }
  })

  return (
    <div className="heatmap-wrap">
      <svg
        className="heatmap"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Activity heatmap"
      >
        {monthLabels.map((m, i) => (
          <text key={i} className="heatmap-month" x={m.x} y={14}>
            {m.label}
          </text>
        ))}
        {[1, 3, 5].map((row) => (
          <text key={row} className="heatmap-wd" x={0} y={TOP + row * STEP + CELL - 1}>
            {WEEKDAY_LABELS[row]}
          </text>
        ))}
        {days.map((d, i) => {
          const pos = wd0 + i
          const col = Math.floor(pos / 7)
          const row = pos % 7
          return (
            <rect
              key={d.date}
              className="heatmap-cell"
              x={LEFT + col * STEP}
              y={TOP + row * STEP}
              width={CELL}
              height={CELL}
              rx={3}
              fill={SHADES[levelOf(d.count, max)]}
            >
              <title>{`${d.date}: ${d.count} ${d.count === 1 ? 'activity' : 'activities'}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="heatmap-legend">
        <span className="muted small">less</span>
        {SHADES.map((c, i) => (
          <span key={i} className="heatmap-swatch" style={{ background: c }} />
        ))}
        <span className="muted small">more</span>
      </div>
    </div>
  )
}
