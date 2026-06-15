import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const COLS = 10
const ROWS = 20
const CELL = 24
const W = COLS * CELL
const H = ROWS * CELL

type Cell = number // 0 = empty, otherwise a piece color
type Shape = number[][] // rotation states are derived at runtime

interface Piece {
  shape: number[][]
  color: number
}

// Each tetromino as a 4-state-friendly matrix; rotation is computed.
const SHAPES: Shape[] = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // O
  [
    [1, 1],
    [1, 1],
  ],
  // T
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  // S
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  // Z
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  // J
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  // L
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
]

// 7 distinct palette colors, one per piece (no purple/violet/indigo/magenta).
const COLORS: number[] = [
  0x8faec4, // I — blue
  0xd9b871, // O — amber
  0xe8d6a8, // T — accent
  0x7fb0a0, // S — green
  0xd98a7e, // Z — red
  0xf4e9cc, // J — accentLight
  0x989aa2, // L — muted
]

const SCORE_TABLE = [0, 100, 300, 500, 800]

function rotateCW(shape: number[][]): number[][] {
  const n = shape.length
  const m = shape[0].length
  const out: number[][] = Array.from({ length: m }, () => Array<number>(n).fill(0))
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < m; c++) {
      out[c][n - 1 - r] = shape[r][c]
    }
  }
  return out
}

export const start: GameStarter = (parent, ctx) => {
  class TetrisScene extends Phaser.Scene {
    private board: Cell[][] = []
    private piece: Piece = { shape: [], color: 0 }
    private px = 0
    private py = 0
    private score = 0
    private lines = 0
    private dropMs = 600
    private dropTimer = 0
    private over = false
    private g!: Phaser.GameObjects.Graphics

    constructor() {
      super('tetris')
    }

    create(): void {
      this.g = this.add.graphics()
      this.board = Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0))
      this.score = 0
      this.lines = 0
      this.dropMs = 600
      this.dropTimer = 0
      this.over = false
      ctx.onScore(0)
      this.spawn()

      this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
        if (this.over) return
        const k = e.key
        if (k === 'ArrowLeft' || k === 'a') this.move(-1)
        else if (k === 'ArrowRight' || k === 'd') this.move(1)
        // Rotate & hard-drop are discrete: one physical press = one action.
        // Ignore the OS key-repeat so holding the key can't spin/drop repeatedly.
        else if (k === 'ArrowUp' || k === 'w') {
          if (!e.repeat) this.rotate()
        } else if (k === 'ArrowDown' || k === 's') this.softDrop()
        else if (k === ' ' || k === 'Spacebar') {
          if (!e.repeat) this.hardDrop()
        }
      })

      this.draw()
    }

    private spawn(): void {
      const idx = Phaser.Math.Between(0, SHAPES.length - 1)
      this.piece = { shape: SHAPES[idx].map((row) => row.slice()), color: COLORS[idx] }
      this.px = Math.floor((COLS - this.piece.shape[0].length) / 2)
      this.py = 0
      if (this.collides(this.piece.shape, this.px, this.py)) {
        this.gameOver()
      }
    }

    private collides(shape: number[][], ox: number, oy: number): boolean {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue
          const x = ox + c
          const y = oy + r
          if (x < 0 || x >= COLS || y >= ROWS) return true
          if (y >= 0 && this.board[y][x]) return true
        }
      }
      return false
    }

    private move(dx: number): void {
      if (!this.collides(this.piece.shape, this.px + dx, this.py)) {
        this.px += dx
        this.draw()
      }
    }

    private rotate(): void {
      const rotated = rotateCW(this.piece.shape)
      // simple wall-kick: try in place, then nudge left/right
      const kicks = [0, -1, 1, -2, 2]
      for (const k of kicks) {
        if (!this.collides(rotated, this.px + k, this.py)) {
          this.piece.shape = rotated
          this.px += k
          this.draw()
          return
        }
      }
    }

    private softDrop(): void {
      if (!this.collides(this.piece.shape, this.px, this.py + 1)) {
        this.py += 1
        this.dropTimer = 0
        this.draw()
      } else {
        this.lock()
      }
    }

    private hardDrop(): void {
      while (!this.collides(this.piece.shape, this.px, this.py + 1)) {
        this.py += 1
      }
      this.lock()
    }

    private lock(): void {
      const { shape, color } = this.piece
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue
          const x = this.px + c
          const y = this.py + r
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) this.board[y][x] = color
        }
      }
      this.clearLines()
      if (!this.over) this.spawn()
      this.draw()
    }

    private clearLines(): void {
      let cleared = 0
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.board[r].every((cell) => cell !== 0)) {
          this.board.splice(r, 1)
          this.board.unshift(Array<Cell>(COLS).fill(0))
          cleared += 1
          r += 1 // recheck the row that shifted down
        }
      }
      if (cleared > 0) {
        this.score += SCORE_TABLE[cleared]
        this.lines += cleared
        ctx.onScore(this.score)
        // speed up gradually: every 10 lines shaves the interval, floor 120ms
        this.dropMs = Math.max(120, 600 - Math.floor(this.lines / 10) * 60)
      }
    }

    update(_time: number, delta: number): void {
      if (this.over) return
      this.dropTimer += delta
      if (this.dropTimer < this.dropMs) return
      this.dropTimer = 0
      if (!this.collides(this.piece.shape, this.px, this.py + 1)) {
        this.py += 1
        this.draw()
      } else {
        this.lock()
      }
    }

    private cellRect(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
      g.fillStyle(color, 1)
      g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)
    }

    private draw(): void {
      const g = this.g
      g.clear()
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      // subtle grid lines
      g.lineStyle(1, 0x1a1c22, 1)
      for (let c = 1; c < COLS; c++) {
        g.lineBetween(c * CELL, 0, c * CELL, H)
      }
      for (let r = 1; r < ROWS; r++) {
        g.lineBetween(0, r * CELL, W, r * CELL)
      }

      // settled board
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = this.board[r][c]
          if (cell) this.cellRect(g, c, r, cell)
        }
      }

      // active piece
      const { shape, color } = this.piece
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue
          const y = this.py + r
          if (y >= 0) this.cellRect(g, this.px + c, y, color)
        }
      }
    }

    private gameOver(): void {
      if (this.over) return
      this.over = true
      ctx.onGameOver({ score: this.score, meta: { lines: this.lines } })
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
    scene: TetrisScene,
  })
}
