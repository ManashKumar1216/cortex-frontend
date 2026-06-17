import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const COLS = 12
const ROWS = 12
const MINES = 22
const CELL = 34
const HEADER = 40
const W = COLS * CELL
const H = HEADER + ROWS * CELL

const NUM_COLORS = ['', '#8faec4', '#7fb0a0', '#d98a7e', '#d9b871', '#e8d6a8', '#f4e9cc', '#989aa2', '#eceae3']

export const start: GameStarter = (parent, ctx) => {
  class MinesweeperScene extends Phaser.Scene {
    private mine: boolean[] = []
    private adj: number[] = []
    private revealed: boolean[] = []
    private flagged: boolean[] = []
    private placed = false
    private started = false
    private startMs = 0
    private elapsed = 0
    private flags = 0
    private over = false
    private g!: Phaser.GameObjects.Graphics
    private labels: Phaser.GameObjects.Text[] = []
    private hud!: Phaser.GameObjects.Text

    constructor() {
      super('minesweeper')
    }

    create(): void {
      this.g = this.add.graphics()
      const total = COLS * ROWS
      this.mine = new Array(total).fill(false)
      this.adj = new Array(total).fill(0)
      this.revealed = new Array(total).fill(false)
      this.flagged = new Array(total).fill(false)
      this.labels = new Array(total)
      this.placed = false
      this.started = false
      this.startMs = 0
      this.elapsed = 0
      this.flags = 0
      this.over = false
      ctx.onScore(0)

      this.hud = this.add
        .text(8, 10, '', { fontFamily: 'monospace', fontSize: '18px', color: '#eceae3' })
        .setDepth(10)

      for (let i = 0; i < total; i++) {
        const c = i % COLS
        const r = Math.floor(i / COLS)
        this.labels[i] = this.add
          .text(c * CELL + CELL / 2, HEADER + r * CELL + CELL / 2, '', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#eceae3',
          })
          .setOrigin(0.5)
          .setDepth(5)
      }

      this.input.mouse?.disableContextMenu()
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (this.over) return
        if (p.y < HEADER) return
        const c = Math.floor(p.x / CELL)
        const r = Math.floor((p.y - HEADER) / CELL)
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return
        const idx = r * COLS + c
        if (p.rightButtonDown()) this.toggleFlag(idx)
        else this.reveal(idx)
      })

      this.draw()
    }

    private idxOf(c: number, r: number): number {
      return r * COLS + c
    }

    private forNeighbours(idx: number, fn: (n: number) => void): void {
      const c = idx % COLS
      const r = Math.floor(idx / COLS)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nc = c + dc
          const nr = r + dr
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue
          fn(this.idxOf(nc, nr))
        }
      }
    }

    private placeMines(safe: number): void {
      const total = COLS * ROWS
      const banned = new Set<number>([safe])
      this.forNeighbours(safe, (n) => banned.add(n))
      let left = MINES
      while (left > 0) {
        const i = Phaser.Math.Between(0, total - 1)
        if (this.mine[i] || banned.has(i)) continue
        this.mine[i] = true
        left--
      }
      for (let i = 0; i < total; i++) {
        let count = 0
        this.forNeighbours(i, (n) => {
          if (this.mine[n]) count++
        })
        this.adj[i] = count
      }
      this.placed = true
    }

    private toggleFlag(idx: number): void {
      if (this.revealed[idx]) return
      this.flagged[idx] = !this.flagged[idx]
      this.flags += this.flagged[idx] ? 1 : -1
      this.draw()
    }

    private reveal(idx: number): void {
      if (this.revealed[idx] || this.flagged[idx]) return
      if (!this.placed) this.placeMines(idx)
      if (!this.started) {
        this.started = true
        this.startMs = this.time.now
      }
      if (this.mine[idx]) {
        this.revealed[idx] = true
        this.draw()
        this.lose()
        return
      }
      // flood fill via stack
      const stack = [idx]
      while (stack.length > 0) {
        const cur = stack.pop() as number
        if (this.revealed[cur] || this.flagged[cur] || this.mine[cur]) continue
        this.revealed[cur] = true
        if (this.adj[cur] === 0) {
          this.forNeighbours(cur, (n) => {
            if (!this.revealed[n] && !this.mine[n]) stack.push(n)
          })
        }
      }
      this.draw()
      this.checkWin()
    }

    private checkWin(): void {
      const total = COLS * ROWS
      let hidden = 0
      for (let i = 0; i < total; i++) {
        if (!this.revealed[i] && !this.mine[i]) hidden++
      }
      if (hidden === 0) this.win()
    }

    update(): void {
      if (this.over || !this.started) return
      const secs = Math.floor((this.time.now - this.startMs) / 1000)
      if (secs !== this.elapsed) {
        this.elapsed = secs
        ctx.onScore(secs)
        this.draw()
      }
    }

    private draw(): void {
      const g = this.g
      g.clear()
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      this.hud.setText(`Time ${this.elapsed}s   Mines ${MINES - this.flags}`)

      const total = COLS * ROWS
      for (let i = 0; i < total; i++) {
        const c = i % COLS
        const r = Math.floor(i / COLS)
        const x = c * CELL
        const y = HEADER + r * CELL
        const lbl = this.labels[i]
        lbl.setText('')
        if (this.revealed[i]) {
          g.fillStyle(this.mine[i] ? 0xd98a7e : 0x32343a, 1)
          g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
          if (this.mine[i]) {
            lbl.setText('*').setColor('#0c0d10')
          } else if (this.adj[i] > 0) {
            lbl.setText(String(this.adj[i])).setColor(NUM_COLORS[this.adj[i]])
          }
        } else {
          g.fillStyle(0x4a4d55, 1)
          g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
          g.fillStyle(0x5a5d66, 1)
          g.fillRect(x + 1, y + 1, CELL - 2, 3)
          if (this.flagged[i]) {
            lbl.setText('⚑').setColor('#d9b871')
          }
        }
      }
    }

    private revealAllMines(): void {
      const total = COLS * ROWS
      for (let i = 0; i < total; i++) {
        if (this.mine[i]) this.revealed[i] = true
      }
      this.draw()
    }

    private lose(): void {
      if (this.over) return
      this.over = true
      this.revealAllMines()
      // Score stays 0 — a loss must not count as a fast clear time. The survival
      // time rides along in meta so the game-over card can show how long you lasted.
      ctx.onGameOver({ score: 0, meta: { win: false, durationSec: this.elapsed } })
      this.scene.pause()
    }

    private win(): void {
      if (this.over) return
      this.over = true
      ctx.onScore(this.elapsed)
      ctx.onGameOver({ score: this.elapsed, meta: { win: true, durationSec: this.elapsed } })
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
    scene: MinesweeperScene,
  })
}
