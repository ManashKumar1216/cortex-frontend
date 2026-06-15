import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const TILE = 20
const HUD_H = 28

// '#'=wall '.'=pellet 'o'=power ' '=empty '-'=ghost-house door
// 19 columns x 21 rows. Row index 10 is the tunnel row (wraps left<->right).
const MAZE: string[] = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '   #.#       #.#   ',
  '####.# ##-## #.####',
  '#......#   #......#',
  '    .  # # #  .    ',
  '#......######......#',
  '####.#   .   #.####',
  '   #.# ##### #.#   ',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....A.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '###################',
]

const COLS = MAZE[0].length
const ROWS = MAZE.length
const W = COLS * TILE
const H = ROWS * TILE + HUD_H
const TUNNEL_ROW = 10

type Vec = { x: number; y: number }

interface Ghost {
  // tile + smooth pixel position
  tx: number
  ty: number
  px: number
  py: number
  dir: Vec
  color: number
  kind: 'A' | 'B' | 'C' | 'D'
  scatterCorner: Vec
  homeCorner: Vec
  spawn: Vec
  releaseAt: number // ms until it leaves the house
  eaten: boolean // returning to house as eyes
  active: boolean // has left the house
}

const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

export const start: GameStarter = (parent, ctx) => {
  class PacScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private hud!: Phaser.GameObjects.Text
    private grid: string[][] = []
    private pelletsLeft = 0

    private pacTile: Vec = { x: 9, y: 15 }
    private pacPix: Vec = { x: 0, y: 0 }
    private pacDir: Vec = { x: 0, y: 0 }
    private wantDir: Vec = { x: 0, y: 0 }
    private pacSpawn: Vec = { x: 9, y: 15 }

    private ghosts: Ghost[] = []

    private score = 0
    private lives = 3
    private level = 1
    private over = false

    private pacSpeed = 0.008 // tiles per ms (~1 tile / 125ms)
    private ghostSpeed = 0.0072 // ~90% of Pac, slightly slower (classic)
    private frightTimer = 0
    private frightChain = 0
    private pulse = 0

    constructor() {
      super('pacman')
    }

    create(): void {
      this.g = this.add.graphics()
      this.hud = this.add.text(8, 6, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#eceae3',
      })

      this.score = 0
      this.lives = 3
      this.level = 1
      this.over = false
      ctx.onScore(0)

      this.loadLevel(true)

      this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
        const k = e.key
        if (k === 'ArrowUp' || k === 'w' || k === 'W') this.wantDir = { x: 0, y: -1 }
        else if (k === 'ArrowDown' || k === 's' || k === 'S') this.wantDir = { x: 0, y: 1 }
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.wantDir = { x: -1, y: 0 }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.wantDir = { x: 1, y: 0 }
      })

      this.drawAll()
      this.updateHud()
    }

    // ---- setup helpers -------------------------------------------------

    private loadLevel(rebuildPellets: boolean): void {
      if (rebuildPellets) {
        this.grid = MAZE.map((row) => row.split(''))
        // clear the 'A' marker that just denotes Pac's start
        this.pelletsLeft = 0
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const c = this.grid[y][x]
            if (c === 'A') this.grid[y][x] = ' '
            if (c === '.' || c === 'o') this.pelletsLeft++
          }
        }
      }
      // gentle per-level ramp; Pac caps higher than ghosts so ghosts stay <= Pac
      this.pacSpeed = Math.min(0.0105, 0.008 + (this.level - 1) * 0.0005)
      this.ghostSpeed = Math.min(0.0095, 0.0072 + (this.level - 1) * 0.0005)
      this.resetPositions()
    }

    private resetPositions(): void {
      this.pacTile = { ...this.pacSpawn }
      this.pacPix = this.tileCenter(this.pacSpawn.x, this.pacSpawn.y)
      this.pacDir = { x: 0, y: 0 }
      this.wantDir = { x: 0, y: 0 }
      this.frightTimer = 0
      this.frightChain = 0

      const houseRow = 9
      const make = (
        kind: Ghost['kind'],
        tx: number,
        ty: number,
        color: number,
        scatter: Vec,
        home: Vec,
        releaseAt: number,
      ): Ghost => ({
        kind,
        tx,
        ty,
        px: this.tileCenter(tx, ty).x,
        py: this.tileCenter(tx, ty).y,
        dir: { x: 0, y: -1 },
        color,
        scatterCorner: scatter,
        homeCorner: home,
        spawn: { x: tx, y: ty },
        releaseAt,
        eaten: false,
        active: false,
      })

      this.ghosts = [
        make('A', 9, houseRow, 0xd98a7e, { x: COLS - 2, y: 1 }, { x: COLS - 2, y: 1 }, 0),
        make('B', 8, houseRow + 1, 0xd9b871, { x: 1, y: 1 }, { x: 1, y: 1 }, 1200),
        make('C', 9, houseRow + 1, 0x7fb0a0, { x: 1, y: ROWS - 2 }, { x: 1, y: ROWS - 2 }, 2600),
        make('D', 10, houseRow + 1, 0x8faec4, { x: COLS - 2, y: ROWS - 2 }, { x: COLS - 2, y: ROWS - 2 }, 4200),
      ]
    }

    private tileCenter(tx: number, ty: number): Vec {
      return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 + HUD_H }
    }

    private isWall(tx: number, ty: number): boolean {
      if (ty < 0 || ty >= ROWS) return true
      // tunnel wrap on tunnel row
      if (tx < 0 || tx >= COLS) {
        if (ty === TUNNEL_ROW) return false
        return true
      }
      const c = this.grid[ty][tx]
      return c === '#'
    }

    // ghosts may not re-enter the house door except when returning as eyes
    private blockedForGhost(g: Ghost, tx: number, ty: number): boolean {
      if (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS) {
        if (this.grid[ty][tx] === '-' && !g.eaten && g.active) return true
      }
      return this.isWall(tx, ty)
    }

    private wrap(tx: number): number {
      if (tx < 0) return COLS - 1
      if (tx >= COLS) return 0
      return tx
    }

    // ---- update loop ---------------------------------------------------

    update(_time: number, delta: number): void {
      if (this.over) return
      const dt = Math.min(delta, 40)
      this.pulse += dt

      if (this.frightTimer > 0) {
        this.frightTimer -= dt
        if (this.frightTimer <= 0) {
          this.frightTimer = 0
          this.frightChain = 0
        }
      }

      this.movePac(dt)
      this.ghosts.forEach((gh) => this.moveGhost(gh, dt))
      this.checkGhostCollisions()

      this.drawAll()
    }

    private atCenter(pix: Vec, tile: Vec): boolean {
      const c = this.tileCenter(tile.x, tile.y)
      return Math.abs(pix.x - c.x) < 0.6 && Math.abs(pix.y - c.y) < 0.6
    }

    private movePac(dt: number): void {
      const dist = this.pacSpeed * dt * TILE
      const center = this.tileCenter(this.pacTile.x, this.pacTile.y)

      // at (or past) a tile center → make turn decisions
      if (this.atCenter(this.pacPix, this.pacTile)) {
        this.pacPix = { ...center }
        // try queued direction first
        if (
          (this.wantDir.x !== 0 || this.wantDir.y !== 0) &&
          !this.isWall(this.wrap(this.pacTile.x + this.wantDir.x), this.pacTile.y + this.wantDir.y)
        ) {
          this.pacDir = { ...this.wantDir }
        }
        // stop if current direction blocked
        if (
          (this.pacDir.x !== 0 || this.pacDir.y !== 0) &&
          this.isWall(this.wrap(this.pacTile.x + this.pacDir.x), this.pacTile.y + this.pacDir.y)
        ) {
          this.pacDir = { x: 0, y: 0 }
        }
        this.eatAt(this.pacTile.x, this.pacTile.y)
      }

      if (this.pacDir.x === 0 && this.pacDir.y === 0) return

      this.pacPix.x += this.pacDir.x * dist
      this.pacPix.y += this.pacDir.y * dist

      // crossed into the next tile center?
      const target = this.tileCenter(
        this.wrap(this.pacTile.x + this.pacDir.x),
        this.pacTile.y + this.pacDir.y,
      )
      const movedPast =
        (this.pacDir.x > 0 && this.pacPix.x >= target.x) ||
        (this.pacDir.x < 0 && this.pacPix.x <= target.x) ||
        (this.pacDir.y > 0 && this.pacPix.y >= target.y) ||
        (this.pacDir.y < 0 && this.pacPix.y <= target.y)

      if (movedPast) {
        this.pacTile = {
          x: this.wrap(this.pacTile.x + this.pacDir.x),
          y: this.pacTile.y + this.pacDir.y,
        }
        this.pacPix = this.tileCenter(this.pacTile.x, this.pacTile.y)
      }
    }

    private eatAt(tx: number, ty: number): void {
      const c = this.grid[ty]?.[tx]
      if (c === '.') {
        this.grid[ty][tx] = ' '
        this.pelletsLeft--
        this.addScore(10)
      } else if (c === 'o') {
        this.grid[ty][tx] = ' '
        this.pelletsLeft--
        this.addScore(50)
        this.frightTimer = 6000
        this.frightChain = 0
        // reverse active ghosts
        this.ghosts.forEach((gh) => {
          if (gh.active && !gh.eaten) gh.dir = { x: -gh.dir.x, y: -gh.dir.y }
        })
      }
      if (this.pelletsLeft <= 0) this.nextLevel()
    }

    private moveGhost(g: Ghost, dt: number): void {
      // release from house on timer
      if (!g.active && !g.eaten) {
        g.releaseAt -= dt
        if (g.releaseAt <= 0) {
          g.active = true
          // nudge toward the door/exit
          g.tx = 9
          g.ty = 8
          const c = this.tileCenter(9, 8)
          g.px = c.x
          g.py = c.y
          g.dir = { x: 0, y: -1 }
        } else {
          // bob gently inside the house
          return
        }
      }

      const frightened = this.frightTimer > 0 && !g.eaten
      const speed = g.eaten ? this.ghostSpeed * 1.7 : frightened ? this.ghostSpeed * 0.55 : this.ghostSpeed
      const dist = speed * dt * TILE

      if (this.atCenter({ x: g.px, y: g.py }, { x: g.tx, y: g.ty })) {
        const c = this.tileCenter(g.tx, g.ty)
        g.px = c.x
        g.py = c.y

        // eyes reached the house → respawn
        if (g.eaten && g.tx === g.spawn.x && g.ty === g.spawn.y) {
          g.eaten = false
          g.active = true
          g.dir = { x: 0, y: -1 }
        }

        const target = this.ghostTarget(g)
        g.dir = this.chooseDir(g, target, frightened)
      }

      if (g.dir.x === 0 && g.dir.y === 0) return
      g.px += g.dir.x * dist
      g.py += g.dir.y * dist

      const target = this.tileCenter(this.wrap(g.tx + g.dir.x), g.ty + g.dir.y)
      const past =
        (g.dir.x > 0 && g.px >= target.x) ||
        (g.dir.x < 0 && g.px <= target.x) ||
        (g.dir.y > 0 && g.py >= target.y) ||
        (g.dir.y < 0 && g.py <= target.y)
      if (past) {
        g.tx = this.wrap(g.tx + g.dir.x)
        g.ty = g.ty + g.dir.y
        const c = this.tileCenter(g.tx, g.ty)
        g.px = c.x
        g.py = c.y
      }
    }

    private ghostTarget(g: Ghost): Vec {
      if (g.eaten) return g.spawn
      if (this.frightTimer > 0) return this.pacTile // flee logic handled by maximizing in chooseDir

      switch (g.kind) {
        case 'A':
          return { ...this.pacTile }
        case 'B': {
          // 4 tiles ahead of Pac
          const d = this.pacDir.x === 0 && this.pacDir.y === 0 ? { x: 1, y: 0 } : this.pacDir
          return { x: this.pacTile.x + d.x * 4, y: this.pacTile.y + d.y * 4 }
        }
        case 'C': {
          // scatter-ish corner that swaps with a timer
          const swap = Math.floor(this.pulse / 7000) % 2 === 0
          return swap ? g.scatterCorner : { ...this.pacTile }
        }
        case 'D': {
          const dx = this.pacTile.x - g.tx
          const dy = this.pacTile.y - g.ty
          const close = dx * dx + dy * dy < 36
          return close ? { ...this.pacTile } : g.homeCorner
        }
        default:
          return { ...this.pacTile }
      }
    }

    private chooseDir(g: Ghost, target: Vec, frightened: boolean): Vec {
      const reverse = { x: -g.dir.x, y: -g.dir.y }
      const options: Vec[] = []
      for (const d of DIRS) {
        if (d.x === reverse.x && d.y === reverse.y) continue
        const nx = this.wrap(g.tx + d.x)
        const ny = g.ty + d.y
        if (this.blockedForGhost(g, nx, ny)) continue
        options.push(d)
      }
      if (options.length === 0) return reverse // dead end → turn around

      let best = options[0]
      let bestScore = frightened ? -Infinity : Infinity
      for (const d of options) {
        const nx = this.wrap(g.tx + d.x)
        const ny = g.ty + d.y
        const ddx = nx - target.x
        const ddy = ny - target.y
        const distSq = ddx * ddx + ddy * ddy
        if (frightened) {
          if (distSq > bestScore) {
            bestScore = distSq
            best = d
          }
        } else if (distSq < bestScore) {
          bestScore = distSq
          best = d
        }
      }
      return best
    }

    private checkGhostCollisions(): void {
      for (const g of this.ghosts) {
        if (g.eaten || !g.active) continue
        const dx = g.px - this.pacPix.x
        const dy = g.py - this.pacPix.y
        if (dx * dx + dy * dy > (TILE * 0.55) * (TILE * 0.55)) continue

        if (this.frightTimer > 0) {
          // eat ghost
          g.eaten = true
          this.frightChain = Math.min(this.frightChain + 1, 4)
          this.addScore(200 * Math.pow(2, this.frightChain - 1))
          // send eyes home
          g.dir = { x: 0, y: -1 }
        } else {
          this.loseLife()
          return
        }
      }
    }

    private loseLife(): void {
      this.lives--
      this.updateHud()
      if (this.lives <= 0) {
        this.gameOver()
        return
      }
      this.resetPositions()
    }

    private nextLevel(): void {
      this.level++
      this.loadLevel(true)
      this.updateHud()
    }

    private addScore(n: number): void {
      this.score += n
      ctx.onScore(this.score)
      this.updateHud()
    }

    private updateHud(): void {
      this.hud.setText(`SCORE ${this.score}   LIVES ${this.lives}   LV ${this.level}`)
    }

    // ---- rendering -----------------------------------------------------

    private drawAll(): void {
      const g = this.g
      g.clear()
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      // walls + pellets
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const c = this.grid[y][x]
          const px = x * TILE
          const py = y * TILE + HUD_H
          if (c === '#') {
            g.fillStyle(0x8faec4, 1)
            g.fillRoundedRect(px + 2, py + 2, TILE - 4, TILE - 4, 5)
          } else if (c === '-') {
            g.fillStyle(0x8faec4, 0.5)
            g.fillRect(px + 2, py + TILE / 2 - 2, TILE - 4, 4)
          } else if (c === '.') {
            g.fillStyle(0xe8d6a8, 1)
            g.fillCircle(px + TILE / 2, py + TILE / 2, 2.2)
          } else if (c === 'o') {
            const r = 4 + Math.sin(this.pulse / 160) * 1.6
            g.fillStyle(0xf4e9cc, 1)
            g.fillCircle(px + TILE / 2, py + TILE / 2, r)
          }
        }
      }

      // Pac-Man (animated mouth)
      const mouth = (Math.abs(Math.sin(this.pulse / 90)) * 0.32 + 0.04) * Math.PI
      let face = 0
      if (this.pacDir.x > 0) face = 0
      else if (this.pacDir.x < 0) face = Math.PI
      else if (this.pacDir.y > 0) face = Math.PI / 2
      else if (this.pacDir.y < 0) face = -Math.PI / 2
      g.fillStyle(0xe8d6a8, 1)
      g.slice(
        this.pacPix.x,
        this.pacPix.y,
        TILE / 2 - 2,
        face + mouth,
        face - mouth + Math.PI * 2,
        false,
      )
      g.fillPath()

      // ghosts
      for (const gh of this.ghosts) {
        const frightened = this.frightTimer > 0 && !gh.eaten
        const r = TILE / 2 - 3
        const cx = gh.px
        const cy = gh.py
        if (gh.eaten) {
          // eyes only
          g.fillStyle(0xeceae3, 1)
          g.fillCircle(cx - 3, cy - 2, 2.6)
          g.fillCircle(cx + 3, cy - 2, 2.6)
          g.fillStyle(0x0c0d10, 1)
          g.fillCircle(cx - 3, cy - 2, 1.2)
          g.fillCircle(cx + 3, cy - 2, 1.2)
          continue
        }
        let body = gh.color
        if (frightened) {
          // blink near the end of the window
          const ending = this.frightTimer < 1500 && Math.floor(this.pulse / 200) % 2 === 0
          body = ending ? 0xeceae3 : 0x989aa2
        }
        g.fillStyle(body, 1)
        // rounded top
        g.fillCircle(cx, cy - 1, r)
        g.fillRect(cx - r, cy - 1, r * 2, r)
        // little feet
        g.fillTriangle(cx - r, cy + r - 1, cx - r + 3, cy + r - 1, cx - r + 1.5, cy + r + 2)
        g.fillTriangle(cx - 1.5, cy + r - 1, cx + 1.5, cy + r - 1, cx, cy + r + 2)
        g.fillTriangle(cx + r - 3, cy + r - 1, cx + r, cy + r - 1, cx + r - 1.5, cy + r + 2)
        // eyes
        g.fillStyle(0xeceae3, 1)
        g.fillCircle(cx - 3, cy - 2, 2.4)
        g.fillCircle(cx + 3, cy - 2, 2.4)
        g.fillStyle(0x0c0d10, 1)
        g.fillCircle(cx - 3 + gh.dir.x * 1.1, cy - 2 + gh.dir.y * 1.1, 1.1)
        g.fillCircle(cx + 3 + gh.dir.x * 1.1, cy - 2 + gh.dir.y * 1.1, 1.1)
      }
    }

    private gameOver(): void {
      this.over = true
      ctx.onGameOver({ score: this.score, meta: { level: this.level } })
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
    scene: PacScene,
  })
}
