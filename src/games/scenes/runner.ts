import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const W = 720
const H = 400
const GROUND_Y = H - 64
const PLAYER_X = 120
const PLAYER_W = 30
const PLAYER_H = 38
const GRAVITY = 0.0026 // px per ms^2
const JUMP_V = -0.92 // px per ms
const MAX_JUMPS = 2

type Obstacle = { x: number; w: number; h: number; coin: boolean }

export const start: GameStarter = (parent, ctx) => {
  class RunnerScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private hud!: Phaser.GameObjects.Text
    private hint!: Phaser.GameObjects.Text
    private playerY = GROUND_Y - PLAYER_H
    private vy = 0
    private jumps = 0
    private speed = 0.26 // px per ms (world scroll)
    private distance = 0
    private score = 0
    private obstacles: Obstacle[] = []
    private spawnTimer = 0
    private spawnGap = 1300
    private legPhase = 0
    private over = false

    constructor() {
      super('runner')
    }

    create(): void {
      this.g = this.add.graphics()
      this.hud = this.add.text(12, 10, '0 m', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#eceae3',
      })
      this.hint = this.add.text(W / 2, 24, 'SPACE / UP / TAP to jump (double jump)', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#989aa2',
      })
      this.hint.setOrigin(0.5, 0.5)

      this.playerY = GROUND_Y - PLAYER_H
      this.vy = 0
      this.jumps = 0
      this.speed = 0.26
      this.distance = 0
      this.score = 0
      this.obstacles = []
      this.spawnTimer = 0
      this.spawnGap = 1300
      this.legPhase = 0
      this.over = false
      ctx.onScore(0)

      this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') this.jump()
      })
      this.input.on('pointerdown', () => this.jump())

      this.draw()
    }

    private jump(): void {
      if (this.over) return
      if (this.jumps >= MAX_JUMPS) return
      this.vy = JUMP_V
      this.jumps += 1
    }

    private spawn(): void {
      const coin = Phaser.Math.Between(0, 4) === 0
      if (coin) {
        this.obstacles.push({ x: W + 20, w: 16, h: 16, coin: true })
        return
      }
      const h = Phaser.Math.Between(26, 64)
      const w = Phaser.Math.Between(18, 34)
      this.obstacles.push({ x: W + 20, w, h, coin: false })
    }

    update(_time: number, delta: number): void {
      if (this.over) return
      const dt = Math.min(delta, 40)

      // ramp world speed slowly over time
      this.speed = Math.min(0.62, this.speed + dt * 0.000004)

      // distance / score
      this.distance += (this.speed * dt) / 6
      const m = Math.floor(this.distance)
      if (m !== this.score) {
        this.score = m
        ctx.onScore(this.score)
      }

      // player vertical physics (manual)
      this.vy += GRAVITY * dt
      this.playerY += this.vy * dt
      const floor = GROUND_Y - PLAYER_H
      if (this.playerY >= floor) {
        this.playerY = floor
        this.vy = 0
        this.jumps = 0
      }

      // run animation phase
      if (this.playerY >= floor) this.legPhase += dt * 0.02

      // spawn obstacles at randomized intervals
      this.spawnTimer += dt
      if (this.spawnTimer >= this.spawnGap) {
        this.spawnTimer = 0
        this.spawnGap = Phaser.Math.Between(820, 1500) - Math.min(360, this.score * 1.2)
        this.spawn()
      }

      // scroll + collide
      const px0 = PLAYER_X
      const px1 = PLAYER_X + PLAYER_W
      const py0 = this.playerY
      const py1 = this.playerY + PLAYER_H
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const o = this.obstacles[i]
        o.x -= this.speed * dt
        const oy = o.coin ? GROUND_Y - 70 : GROUND_Y - o.h
        const ox0 = o.x
        const ox1 = o.x + o.w
        const oy0 = oy
        const oy1 = oy + o.h
        const hit = px1 > ox0 && px0 < ox1 && py1 > oy0 && py0 < oy1
        if (hit) {
          if (o.coin) {
            this.score += 5
            ctx.onScore(this.score)
            this.obstacles.splice(i, 1)
            continue
          }
          this.gameOver()
          return
        }
        if (o.x + o.w < -10) this.obstacles.splice(i, 1)
      }

      this.draw()
    }

    private draw(): void {
      const g = this.g
      g.clear()

      // background
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      // distant hills (parallax, slow)
      g.fillStyle(0x8faec4, 0.16)
      const hillShift = (this.distance * 1.4) % 240
      for (let hx = -hillShift; hx < W; hx += 240) {
        g.fillTriangle(hx, GROUND_Y, hx + 80, GROUND_Y - 70, hx + 160, GROUND_Y)
      }

      // ground line + dashes
      g.fillStyle(0x989aa2, 1)
      g.fillRect(0, GROUND_Y, W, 3)
      g.fillStyle(0x989aa2, 0.5)
      const dashShift = (this.distance * 6) % 40
      for (let dx = -dashShift; dx < W; dx += 40) {
        g.fillRect(dx, GROUND_Y + 12, 18, 3)
      }

      // obstacles + coins
      for (const o of this.obstacles) {
        if (o.coin) {
          g.fillStyle(0xd9b871, 1)
          g.fillCircle(o.x + o.w / 2, GROUND_Y - 70 + o.h / 2, o.w / 2)
          g.fillStyle(0xf4e9cc, 1)
          g.fillCircle(o.x + o.w / 2, GROUND_Y - 70 + o.h / 2, o.w / 4)
        } else {
          g.fillStyle(o.h > 48 ? 0xd98a7e : 0xd9b871, 1)
          g.fillRect(o.x, GROUND_Y - o.h, o.w, o.h)
          g.fillStyle(0x0c0d10, 0.18)
          g.fillRect(o.x + o.w - 4, GROUND_Y - o.h, 4, o.h)
        }
      }

      // player
      g.fillStyle(0xe8d6a8, 1)
      g.fillRect(PLAYER_X, this.playerY, PLAYER_W, PLAYER_H)
      // eye
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(PLAYER_X + PLAYER_W - 10, this.playerY + 7, 5, 5)
      // legs (animate when grounded)
      g.fillStyle(0xf4e9cc, 1)
      const grounded = this.playerY >= GROUND_Y - PLAYER_H - 0.5
      const swing = grounded ? Math.sin(this.legPhase) * 5 : 0
      g.fillRect(PLAYER_X + 4, this.playerY + PLAYER_H, 7, 8 + swing)
      g.fillRect(PLAYER_X + PLAYER_W - 11, this.playerY + PLAYER_H, 7, 8 - swing)

      // HUD
      this.hud.setText(`${this.score} m`)
    }

    private gameOver(): void {
      this.over = true
      ctx.onGameOver({ score: this.score, meta: { distance: Math.floor(this.distance) } })
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
    scene: RunnerScene,
  })
}
