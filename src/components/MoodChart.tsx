import type { MoodPoint } from '../lib/types'

const W = 320
const H = 120
const PAD_X = 10
const PAD_Y = 14

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

/**
 * A tiny hand-rolled SVG sparkline of daily mood (1–5). No charting dependency:
 * the data is one number per day, so plain <polyline>/<circle> over a fixed
 * viewBox (which CSS scales to width) is all it needs. Palette only — gold line,
 * faint gridlines; no purple anywhere.
 */
export function MoodChart({ points }: { points: MoodPoint[] }) {
  if (points.length === 0) {
    return <p className="muted small mood-chart-empty">No mood data in this range yet.</p>
  }

  const n = points.length
  const innerW = W - PAD_X * 2
  const innerH = H - PAD_Y * 2
  const x = (i: number): number => (n === 1 ? W / 2 : PAD_X + (i / (n - 1)) * innerW)
  const y = (m: number): number => PAD_Y + (1 - (clamp(m, 1, 5) - 1) / 4) * innerH

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.mood).toFixed(1)}`).join(' ')
  const area = `${x(0).toFixed(1)},${H - PAD_Y} ${line} ${x(n - 1).toFixed(1)},${H - PAD_Y}`

  return (
    <svg className="mood-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mood trend">
      {[1, 2, 3, 4, 5].map((m) => (
        <line key={m} className="mood-grid" x1={PAD_X} x2={W - PAD_X} y1={y(m)} y2={y(m)} />
      ))}
      <polygon className="mood-area" points={area} />
      <polyline className="mood-line" points={line} />
      {points.map((p, i) => (
        <circle key={p.date} className="mood-dot" cx={x(i)} cy={y(p.mood)} r={2.6}>
          <title>{`${p.date}: ${p.mood}/5`}</title>
        </circle>
      ))}
    </svg>
  )
}
