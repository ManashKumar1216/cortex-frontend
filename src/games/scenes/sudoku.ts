import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const W = 480
const H = 600

type SizeDef = { n: number; boxRows: number; boxCols: number; givens: number }

const SIZES: SizeDef[] = [
  { n: 4, boxRows: 2, boxCols: 2, givens: 0.55 },
  { n: 6, boxRows: 2, boxCols: 3, givens: 0.5 },
  { n: 9, boxRows: 3, boxCols: 3, givens: 0.42 },
]

type Mode = 'menu' | 'playing'

function shuffled(n: number): number[] {
  const a: number[] = []
  for (let i = 1; i <= n; i++) a.push(i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

export const start: GameStarter = (parent, ctx) => {
  class SudokuScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private texts: Phaser.GameObjects.Text[] = []
    private hud!: Phaser.GameObjects.Text
    private subHud!: Phaser.GameObjects.Text

    private mode: Mode = 'menu'
    private over = false

    private def: SizeDef = SIZES[0]
    private n = 4
    private boxRows = 2
    private boxCols = 2

    private value: number[][] = []
    private given: boolean[][] = []
    private solution: number[][] = []
    private conflict: boolean[][] = []

    private selRow = -1
    private selCol = -1

    private startTime = 0
    private elapsed = 0
    private lastReported = -1

    // layout (recomputed per puzzle)
    private cell = 0
    private gridX = 0
    private gridY = 0
    private gridSize = 0

    // pad layout
    private padButtons: { x: number; y: number; w: number; h: number; label: string; val: number }[] = []

    constructor() {
      super('sudoku')
    }

    create(): void {
      this.g = this.add.graphics()
      this.hud = this.add
        .text(W / 2, 16, '', { fontFamily: 'monospace', fontSize: '18px', color: '#e8d6a8' })
        .setOrigin(0.5, 0)
        .setDepth(10)
      this.subHud = this.add
        .text(W / 2, 40, '', { fontFamily: 'monospace', fontSize: '13px', color: '#989aa2' })
        .setOrigin(0.5, 0)
        .setDepth(10)

      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointer(p.x, p.y))

      this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e))

      this.showMenu()
    }

    private showMenu(): void {
      this.mode = 'menu'
      this.clearTexts()
      this.hud.setText('Sudoku')
      this.subHud.setText('pick a size')
      this.drawMenu()
    }

    private startGame(def: SizeDef): void {
      this.def = def
      this.n = def.n
      this.boxRows = def.boxRows
      this.boxCols = def.boxCols
      this.over = false
      this.selRow = -1
      this.selCol = -1
      this.elapsed = 0
      this.lastReported = -1

      this.buildSolution()
      this.makePuzzle()
      this.computeLayout()
      this.recomputeConflicts()

      this.mode = 'playing'
      this.startTime = this.time.now
      ctx.onScore(0)
      this.lastReported = 0
      this.render()
    }

    // ----- generation -----

    private isLegal(board: number[][], r: number, c: number, v: number): boolean {
      const n = this.n
      for (let i = 0; i < n; i++) {
        if (i !== c && board[r][i] === v) return false
        if (i !== r && board[i][c] === v) return false
      }
      const r0 = Math.floor(r / this.boxRows) * this.boxRows
      const c0 = Math.floor(c / this.boxCols) * this.boxCols
      for (let rr = r0; rr < r0 + this.boxRows; rr++) {
        for (let cc = c0; cc < c0 + this.boxCols; cc++) {
          if ((rr !== r || cc !== c) && board[rr][cc] === v) return false
        }
      }
      return true
    }

    private buildSolution(): void {
      const n = this.n
      const board: number[][] = []
      for (let r = 0; r < n; r++) board.push(new Array<number>(n).fill(0))

      const fill = (idx: number): boolean => {
        if (idx === n * n) return true
        const r = Math.floor(idx / n)
        const c = idx % n
        for (const v of shuffled(n)) {
          if (this.isLegal(board, r, c, v)) {
            board[r][c] = v
            if (fill(idx + 1)) return true
            board[r][c] = 0
          }
        }
        return false
      }

      fill(0)
      this.solution = board
    }

    private makePuzzle(): void {
      const n = this.n
      this.value = []
      this.given = []
      this.conflict = []
      for (let r = 0; r < n; r++) {
        this.value.push(this.solution[r].slice())
        this.given.push(new Array<boolean>(n).fill(true))
        this.conflict.push(new Array<boolean>(n).fill(false))
      }

      const total = n * n
      const keep = Math.round(total * this.def.givens)
      const remove = total - keep

      const order = shuffled(total).map((x) => x - 1) // 0..total-1 shuffled
      for (let i = 0; i < remove; i++) {
        const idx = order[i]
        const r = Math.floor(idx / n)
        const c = idx % n
        this.value[r][c] = 0
        this.given[r][c] = false
      }
    }

    // ----- layout -----

    private computeLayout(): void {
      const n = this.n
      this.cell = Math.floor(Math.min(420, W - 40) / n)
      this.gridSize = this.cell * n
      this.gridX = Math.floor((W - this.gridSize) / 2)
      this.gridY = 70

      // number pad below grid
      this.padButtons = []
      const padY = this.gridY + this.gridSize + 24
      const count = n + 1 // digits + erase
      const padGap = 8
      const maxRowW = W - 40
      const btnW = Math.floor((maxRowW - padGap * (count - 1)) / count)
      const clampedW = Math.min(btnW, 56)
      const btnH = 44
      const totalW = clampedW * count + padGap * (count - 1)
      let px = Math.floor((W - totalW) / 2)
      for (let v = 1; v <= n; v++) {
        this.padButtons.push({ x: px, y: padY, w: clampedW, h: btnH, label: String(v), val: v })
        px += clampedW + padGap
      }
      this.padButtons.push({ x: px, y: padY, w: clampedW, h: btnH, label: 'X', val: 0 })
    }

    // ----- input -----

    private onPointer(x: number, y: number): void {
      if (this.over) return
      if (this.mode === 'menu') {
        for (const b of this.menuButtons()) {
          if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            this.startGame(b.def)
            return
          }
        }
        return
      }

      // grid cell?
      if (
        x >= this.gridX &&
        x < this.gridX + this.gridSize &&
        y >= this.gridY &&
        y < this.gridY + this.gridSize
      ) {
        const c = Math.floor((x - this.gridX) / this.cell)
        const r = Math.floor((y - this.gridY) / this.cell)
        if (r >= 0 && r < this.n && c >= 0 && c < this.n) {
          this.selRow = r
          this.selCol = c
          this.render()
        }
        return
      }

      // pad button?
      for (const b of this.padButtons) {
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          this.place(b.val)
          return
        }
      }
    }

    private onKey(e: KeyboardEvent): void {
      if (this.over || this.mode !== 'playing') return
      const k = e.key
      if (k === 'ArrowUp') this.moveSel(0, -1)
      else if (k === 'ArrowDown') this.moveSel(0, 1)
      else if (k === 'ArrowLeft') this.moveSel(-1, 0)
      else if (k === 'ArrowRight') this.moveSel(1, 0)
      else if (k === 'Backspace' || k === 'Delete' || k === '0') this.place(0)
      else if (/^[1-9]$/.test(k)) {
        const v = parseInt(k, 10)
        if (v >= 1 && v <= this.n) this.place(v)
      }
    }

    private moveSel(dx: number, dy: number): void {
      if (this.selRow < 0) {
        this.selRow = 0
        this.selCol = 0
      } else {
        this.selCol = Phaser.Math.Clamp(this.selCol + dx, 0, this.n - 1)
        this.selRow = Phaser.Math.Clamp(this.selRow + dy, 0, this.n - 1)
      }
      this.render()
    }

    private place(v: number): void {
      if (this.selRow < 0 || this.selCol < 0) return
      if (this.given[this.selRow][this.selCol]) return
      this.value[this.selRow][this.selCol] = v
      this.recomputeConflicts()
      this.render()
      this.checkWin()
    }

    // ----- rules -----

    private recomputeConflicts(): void {
      const n = this.n
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) this.conflict[r][c] = false
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const v = this.value[r][c]
          if (v === 0) continue
          if (!this.isLegal(this.value, r, c, v)) this.conflict[r][c] = true
        }
      }
    }

    private countConflicts(): number {
      let k = 0
      for (let r = 0; r < this.n; r++) for (let c = 0; c < this.n; c++) if (this.conflict[r][c]) k++
      return k
    }

    private checkWin(): void {
      for (let r = 0; r < this.n; r++) {
        for (let c = 0; c < this.n; c++) {
          if (this.value[r][c] === 0) return
          if (this.conflict[r][c]) return
        }
      }
      this.win()
    }

    private win(): void {
      this.over = true
      ctx.onScore(this.elapsed)
      ctx.onGameOver({ score: this.elapsed, meta: { size: this.n, win: true } })
      this.scene.pause()
    }

    // ----- timer -----

    update(_time: number, _delta: number): void {
      if (this.over || this.mode !== 'playing') return
      this.elapsed = Math.floor((this.time.now - this.startTime) / 1000)
      if (this.elapsed !== this.lastReported) {
        this.lastReported = this.elapsed
        ctx.onScore(this.elapsed)
        this.updateHud()
      }
    }

    private fmtTime(s: number): string {
      const m = Math.floor(s / 60)
      const sec = s % 60
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    }

    private updateHud(): void {
      this.hud.setText(`${this.n} x ${this.n}   ${this.fmtTime(this.elapsed)}`)
      const k = this.countConflicts()
      this.subHud.setText(k > 0 ? `Conflicts: ${k}` : 'no conflicts')
    }

    // ----- menu -----

    private menuButtons(): { x: number; y: number; w: number; h: number; def: SizeDef }[] {
      const bw = 200
      const bh = 56
      const gap = 18
      const x = Math.floor((W - bw) / 2)
      const startY = 220
      return SIZES.map((def, i) => ({ x, y: startY + i * (bh + gap), w: bw, h: bh, def }))
    }

    private drawMenu(): void {
      const g = this.g
      g.clear()
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      for (const b of this.menuButtons()) {
        g.fillStyle(0x1d1f24, 1)
        g.fillRoundedRect(b.x, b.y, b.w, b.h, 10)
        g.lineStyle(2, 0xe8d6a8, 0.7)
        g.strokeRoundedRect(b.x, b.y, b.w, b.h, 10)
        const label = `${b.def.n} × ${b.def.n}`
        this.texts.push(
          this.add
            .text(b.x + b.w / 2, b.y + b.h / 2, label, {
              fontFamily: 'monospace',
              fontSize: '24px',
              color: '#f4e9cc',
            })
            .setOrigin(0.5)
            .setDepth(5),
        )
      }
    }

    // ----- render -----

    private clearTexts(): void {
      for (const t of this.texts) t.destroy()
      this.texts = []
    }

    private render(): void {
      this.clearTexts()
      this.updateHud()

      const g = this.g
      g.clear()
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      const n = this.n
      const cs = this.cell
      const gx = this.gridX
      const gy = this.gridY

      // cell fills
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const cx = gx + c * cs
          const cy = gy + r * cs
          let fill = 0x17181c
          if (this.given[r][c]) fill = 0x121316
          // selected cell highlight (soft accent)
          if (r === this.selRow && c === this.selCol) {
            fill = 0x1d1f24
          }
          g.fillStyle(fill, 1)
          g.fillRect(cx, cy, cs, cs)
        }
      }

      // highlight selected row/col/box softly + selected cell border
      if (this.selRow >= 0 && this.selCol >= 0) {
        const sx = gx + this.selCol * cs
        const sy = gy + this.selRow * cs
        g.fillStyle(0xe8d6a8, 0.12)
        // row band
        g.fillRect(gx, sy, this.gridSize, cs)
        // col band
        g.fillRect(sx, gy, cs, this.gridSize)
        // selected cell
        g.fillStyle(0xe8d6a8, 0.18)
        g.fillRect(sx, sy, cs, cs)
      }

      // conflict tint
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (this.conflict[r][c]) {
            g.fillStyle(0xd98a7e, 0.18)
            g.fillRect(gx + c * cs, gy + r * cs, cs, cs)
          }
        }
      }

      // thin grid lines
      g.lineStyle(1, 0x3a3c42, 1)
      for (let i = 0; i <= n; i++) {
        g.lineBetween(gx + i * cs, gy, gx + i * cs, gy + this.gridSize)
        g.lineBetween(gx, gy + i * cs, gx + this.gridSize, gy + i * cs)
      }

      // thick box-boundary lines (accent)
      g.lineStyle(3, 0xe8d6a8, 0.85)
      // vertical box edges fall on cols that are multiples of boxCols
      for (let c = 0; c <= n; c += this.boxCols) {
        g.lineBetween(gx + c * cs, gy, gx + c * cs, gy + this.gridSize)
      }
      // horizontal box edges fall on rows that are multiples of boxRows
      for (let r = 0; r <= n; r += this.boxRows) {
        g.lineBetween(gx, gy + r * cs, gx + this.gridSize, gy + r * cs)
      }

      // numbers
      const fontSize = Math.floor(cs * 0.55)
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const v = this.value[r][c]
          if (v === 0) continue
          let color = '#e8d6a8' // player-entered
          if (this.given[r][c]) color = '#f4e9cc' // givens bright/neutral
          if (this.conflict[r][c]) color = '#d98a7e' // conflict red
          this.texts.push(
            this.add
              .text(gx + c * cs + cs / 2, gy + r * cs + cs / 2, String(v), {
                fontFamily: 'monospace',
                fontSize: `${fontSize}px`,
                color,
              })
              .setOrigin(0.5)
              .setDepth(5),
          )
        }
      }

      // number pad
      for (const b of this.padButtons) {
        g.fillStyle(b.val === 0 ? 0x1d1f24 : 0x17181c, 1)
        g.fillRoundedRect(b.x, b.y, b.w, b.h, 8)
        g.lineStyle(2, b.val === 0 ? 0xd98a7e : 0xe8d6a8, 0.7)
        g.strokeRoundedRect(b.x, b.y, b.w, b.h, 8)
        this.texts.push(
          this.add
            .text(b.x + b.w / 2, b.y + b.h / 2, b.label, {
              fontFamily: 'monospace',
              fontSize: '20px',
              color: b.val === 0 ? '#d98a7e' : '#eceae3',
            })
            .setOrigin(0.5)
            .setDepth(5),
        )
      }
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#0c0d10',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: SudokuScene,
  })
}
