import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const COLS = 13
const ROWS = 15
const TILE = 32
const W = COLS * TILE
const H = ROWS * TILE

// Theme palette
const C_BG = 0x0c0d10
const C_ACCENT = 0xe8d6a8
const C_ACCENT_LIGHT = 0xf4e9cc
const C_GREEN = 0x7fb0a0
const C_RED = 0xd98a7e
const C_AMBER = 0xd9b871
const C_BLUE = 0x8faec4
const C_MUTED = 0x989aa2
const C_WATER = 0x141d28
const C_SAFE = 0x101319

type Mover = {
  x: number // tile-space x (float), left edge
  len: number // length in tiles
  speed: number // tiles per second (signed; negative = leftward)
  color: number
}

type Lane = {
  row: number
  kind: 'road' | 'river'
  movers: Mover[]
}

export const start: GameStarter = (parent, ctx) => {
  class FroggerScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private hud!: Phaser.GameObjects.Text
    private lanes: Lane[] = []
    private frogCol = 6
    private frogRow = ROWS - 1
    private frogX = 6 // float tile-space, allows drifting on logs
    private maxRowReached = ROWS - 1
    private score = 0
    private lives = 3
    private goals = 0
    private over = false

    constructor() {
      super('frogger')
    }

    create(): void {
      this.g = this.add.graphics()
      this.hud = this.add.text(8, H - 22, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#eceae3',
      })
      this.hud.setDepth(10)

      this.score = 0
      this.lives = 3
      this.goals = 0
      this.over = false
      this.maxRowReached = ROWS - 1
      ctx.onScore(0)

      this.buildLanes()
      this.resetFrog()

      this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
        const k = e.key
        if (k === 'ArrowUp' || k === 'w' || k === 'W') this.hop(0, -1)
        else if (k === 'ArrowDown' || k === 's' || k === 'S') this.hop(0, 1)
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.hop(-1, 0)
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.hop(1, 0)
      })

      let sx = 0
      let sy = 0
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        sx = p.x
        sy = p.y
      })
      this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
        const dx = p.x - sx
        const dy = p.y - sy
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return
        if (Math.abs(dx) > Math.abs(dy)) this.hop(dx > 0 ? 1 : -1, 0)
        else this.hop(0, dy > 0 ? 1 : -1)
      })

      this.drawHud()
      this.draw()
    }

    private buildLanes(): void {
      // Layout: row 0 = goal, rows 1-5 river, row 6 median, rows 7-12 road,
      // rows 13-14 safe start zone.
      const speedBump = 1 + this.goals * 0.12
      this.lanes = []

      // River lanes (logs / turtles) — rows 1-5
      const riverDefs: { row: number; dir: number; speed: number; len: number; gap: number; color: number }[] = [
        { row: 1, dir: 1, speed: 1.4, len: 3, gap: 4, color: C_MUTED },
        { row: 2, dir: -1, speed: 1.8, len: 2, gap: 3, color: C_GREEN },
        { row: 3, dir: 1, speed: 2.2, len: 2, gap: 4, color: C_AMBER },
        { row: 4, dir: -1, speed: 1.2, len: 4, gap: 5, color: C_MUTED },
        { row: 5, dir: 1, speed: 1.6, len: 3, gap: 4, color: C_GREEN },
      ]
      for (const d of riverDefs) {
        const movers: Mover[] = []
        const span = d.len + d.gap
        let x = 0
        while (x < COLS + span) {
          movers.push({ x, len: d.len, speed: d.dir * d.speed * speedBump, color: d.color })
          x += span
        }
        this.lanes.push({ row: d.row, kind: 'river', movers })
      }

      // Road lanes (cars) — rows 7-12
      const roadDefs: { row: number; dir: number; speed: number; len: number; gap: number; color: number }[] = [
        { row: 7, dir: -1, speed: 2.0, len: 1, gap: 4, color: C_RED },
        { row: 8, dir: 1, speed: 2.6, len: 1, gap: 5, color: C_AMBER },
        { row: 9, dir: -1, speed: 3.2, len: 2, gap: 6, color: C_BLUE },
        { row: 10, dir: 1, speed: 1.8, len: 1, gap: 4, color: C_RED },
        { row: 11, dir: -1, speed: 2.4, len: 2, gap: 5, color: C_AMBER },
        { row: 12, dir: 1, speed: 3.0, len: 1, gap: 5, color: C_BLUE },
      ]
      for (const d of roadDefs) {
        const movers: Mover[] = []
        const span = d.len + d.gap
        let x = 0
        while (x < COLS + span) {
          movers.push({ x, len: d.len, speed: d.dir * d.speed * speedBump, color: d.color })
          x += span
        }
        this.lanes.push({ row: d.row, kind: 'road', movers })
      }
    }

    private laneAt(row: number): Lane | undefined {
      return this.lanes.find((l) => l.row === row)
    }

    private resetFrog(): void {
      this.frogCol = 6
      this.frogRow = ROWS - 1
      this.frogX = 6
      this.maxRowReached = ROWS - 1
    }

    private hop(dx: number, dy: number): void {
      if (this.over) return
      const nc = Phaser.Math.Clamp(this.frogCol + dx, 0, COLS - 1)
      const nr = Phaser.Math.Clamp(this.frogRow + dy, 0, ROWS - 1)
      if (nc === this.frogCol && nr === this.frogRow) return
      this.frogCol = nc
      this.frogRow = nr
      this.frogX = nc

      // Forward progress bonus
      if (this.frogRow < this.maxRowReached) {
        const rows = this.maxRowReached - this.frogRow
        this.maxRowReached = this.frogRow
        this.score += rows * 10
        ctx.onScore(this.score)
      }

      if (this.frogRow === 0) this.reachGoal()
      this.drawHud()
    }

    private reachGoal(): void {
      this.score += 100
      this.goals += 1
      ctx.onScore(this.score)
      this.buildLanes() // speeds up a touch each goal
      this.resetFrog()
    }

    private loseLife(): void {
      this.lives -= 1
      if (this.lives <= 0) {
        this.gameOver()
        return
      }
      this.resetFrog()
      this.drawHud()
    }

    update(_time: number, delta: number): void {
      if (this.over) return
      const dt = delta / 1000

      // Advance all movers, wrapping around the field.
      for (const lane of this.lanes) {
        const span = COLS + 6
        for (const m of lane.movers) {
          m.x += m.speed * dt
          if (m.speed > 0 && m.x > COLS + 3) m.x -= span
          else if (m.speed < 0 && m.x + m.len < -3) m.x += span
        }
      }

      const lane = this.laneAt(this.frogRow)
      if (lane) {
        if (lane.kind === 'river') {
          // Find a log under the frog's current center.
          const center = this.frogX + 0.5
          let carrier: Mover | null = null
          for (const m of lane.movers) {
            if (center >= m.x && center <= m.x + m.len) {
              carrier = m
              break
            }
          }
          if (carrier) {
            this.frogX += carrier.speed * dt
            if (this.frogX < -0.5 || this.frogX > COLS - 0.5) {
              // carried off-screen
              this.loseLife()
              this.draw()
              return
            }
            this.frogCol = Phaser.Math.Clamp(Math.round(this.frogX), 0, COLS - 1)
          } else {
            // In water with no log → drown.
            this.loseLife()
            this.draw()
            return
          }
        } else {
          // Road — check car collisions against the frog's tile span.
          const fl = this.frogCol
          const fr = this.frogCol + 1
          for (const m of lane.movers) {
            if (m.x < fr && m.x + m.len > fl) {
              this.loseLife()
              this.draw()
              return
            }
          }
        }
      }

      this.draw()
    }

    private draw(): void {
      const g = this.g
      g.clear()
      g.fillStyle(C_BG, 1)
      g.fillRect(0, 0, W, H)

      // Row backgrounds
      for (let r = 0; r < ROWS; r++) {
        const y = r * TILE
        let col = C_SAFE
        if (r === 0) col = C_SAFE // goal zone
        else if (r >= 1 && r <= 5) col = C_WATER
        else if (r === 6) col = C_SAFE // median
        else if (r >= 7 && r <= 12) col = 0x16171c // road
        else col = C_SAFE // start zone
        g.fillStyle(col, 1)
        g.fillRect(0, y, W, TILE)
      }

      // Goal row markers (accent slots)
      g.fillStyle(C_ACCENT, 0.18)
      for (let c = 0; c < COLS; c += 2) {
        g.fillRect(c * TILE + 4, 4, TILE - 8, TILE - 8)
      }

      // Lane road dividers
      g.lineStyle(1, C_MUTED, 0.25)
      for (let r = 7; r <= 12; r++) {
        const y = r * TILE
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(W, y)
        g.strokePath()
      }

      // Movers
      for (const lane of this.lanes) {
        const y = lane.row * TILE
        for (const m of lane.movers) {
          const px = m.x * TILE
          const pw = m.len * TILE
          if (lane.kind === 'river') {
            g.fillStyle(m.color, 1)
            g.fillRect(px + 1, y + 4, pw - 2, TILE - 8)
            // wood-grain accent line
            g.fillStyle(C_BG, 0.25)
            g.fillRect(px + 1, y + TILE / 2 - 1, pw - 2, 2)
          } else {
            g.fillStyle(m.color, 1)
            g.fillRect(px + 2, y + 5, pw - 4, TILE - 10)
            // windshield highlight
            g.fillStyle(C_ACCENT_LIGHT, 0.4)
            const wx = m.speed > 0 ? px + pw - 8 : px + 4
            g.fillRect(wx, y + 8, 4, TILE - 16)
          }
        }
      }

      // Frog
      const fx = this.frogX * TILE
      const fy = this.frogRow * TILE
      g.fillStyle(C_GREEN, 1)
      g.fillRect(fx + 5, fy + 5, TILE - 10, TILE - 10)
      // legs
      g.fillStyle(C_GREEN, 1)
      g.fillRect(fx + 2, fy + 8, 4, 6)
      g.fillRect(fx + TILE - 6, fy + 8, 4, 6)
      g.fillRect(fx + 2, fy + TILE - 14, 4, 6)
      g.fillRect(fx + TILE - 6, fy + TILE - 14, 4, 6)
      // eye bumps
      g.fillStyle(C_ACCENT_LIGHT, 1)
      g.fillRect(fx + 8, fy + 6, 5, 5)
      g.fillRect(fx + TILE - 13, fy + 6, 5, 5)
      g.fillStyle(C_BG, 1)
      g.fillRect(fx + 9, fy + 7, 2, 2)
      g.fillRect(fx + TILE - 12, fy + 7, 2, 2)
    }

    private drawHud(): void {
      const hearts = '♥'.repeat(Math.max(0, this.lives))
      this.hud.setText(`SCORE ${this.score}   LIVES ${hearts}   GOALS ${this.goals}`)
    }

    private gameOver(): void {
      this.over = true
      this.drawHud()
      ctx.onGameOver({ score: this.score, meta: { goals: this.goals } })
      this.scene.pause()
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#0c0d10',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: FroggerScene,
  })
}
