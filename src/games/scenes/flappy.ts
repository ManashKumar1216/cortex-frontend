import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const W = 400
const H = 600
const GROUND = 60
const PLAY_H = H - GROUND

const BIRD_X = 110
const BIRD_R = 12
const GRAVITY = 1500 // px/s^2
const FLAP_VY = -440 // px/s impulse

const PIPE_W = 56
const GAP = 160
const PIPE_SPEED = 150 // px/s
const SPAWN_MS = 1500

type Pipe = { x: number; gapY: number; passed: boolean }

export const start: GameStarter = (parent, ctx) => {
  class FlappyScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private hint!: Phaser.GameObjects.Text
    private pipes: Pipe[] = []
    private birdY = PLAY_H / 2
    private vy = 0
    private score = 0
    private spawnTimer = 0
    private started = false
    private over = false

    constructor() {
      super('flappy')
    }

    create(): void {
      this.g = this.add.graphics()
      this.pipes = []
      this.birdY = PLAY_H / 2
      this.vy = 0
      this.score = 0
      this.spawnTimer = 0
      this.started = false
      this.over = false
      ctx.onScore(0)

      this.hint = this.add
        .text(W / 2, PLAY_H / 2 - 70, 'tap / space to fly', {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#eceae3',
        })
        .setOrigin(0.5)

      this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') this.flap()
      })
      this.input.on('pointerdown', () => this.flap())

      this.draw()
    }

    private flap(): void {
      if (this.over) return
      if (!this.started) {
        this.started = true
        this.hint.setVisible(false)
      }
      this.vy = FLAP_VY
    }

    private spawnPipe(): void {
      const margin = 60
      const gapY = Phaser.Math.Between(margin + GAP / 2, PLAY_H - margin - GAP / 2)
      this.pipes.push({ x: W + PIPE_W, gapY, passed: false })
    }

    update(_time: number, delta: number): void {
      if (this.over || !this.started) {
        this.draw()
        return
      }
      const dt = delta / 1000

      this.vy += GRAVITY * dt
      this.birdY += this.vy * dt

      this.spawnTimer += delta
      if (this.spawnTimer >= SPAWN_MS) {
        this.spawnTimer = 0
        this.spawnPipe()
      }

      for (const p of this.pipes) {
        p.x -= PIPE_SPEED * dt
        if (!p.passed && p.x + PIPE_W / 2 < BIRD_X) {
          p.passed = true
          this.score += 1
          ctx.onScore(this.score)
        }
      }
      this.pipes = this.pipes.filter((p) => p.x + PIPE_W / 2 > 0)

      // ground / ceiling
      if (this.birdY - BIRD_R <= 0 || this.birdY + BIRD_R >= PLAY_H) {
        this.gameOver()
        return
      }

      // pipe collisions
      for (const p of this.pipes) {
        const left = p.x - PIPE_W / 2
        const right = p.x + PIPE_W / 2
        const withinX = BIRD_X + BIRD_R > left && BIRD_X - BIRD_R < right
        if (!withinX) continue
        const topGap = p.gapY - GAP / 2
        const botGap = p.gapY + GAP / 2
        if (this.birdY - BIRD_R < topGap || this.birdY + BIRD_R > botGap) {
          this.gameOver()
          return
        }
      }

      this.draw()
    }

    private draw(): void {
      const g = this.g
      g.clear()
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      // buildings
      for (const p of this.pipes) {
        const left = p.x - PIPE_W / 2
        const topGap = p.gapY - GAP / 2
        const botGap = p.gapY + GAP / 2
        g.fillStyle(0xe8d6a8, 1)
        g.fillRect(left, 0, PIPE_W, topGap)
        g.fillRect(left, botGap, PIPE_W, PLAY_H - botGap)
        // edge caps
        g.fillStyle(0x989aa2, 1)
        g.fillRect(left, topGap - 12, PIPE_W, 12)
        g.fillRect(left, botGap, PIPE_W, 12)
      }

      // ground strip
      g.fillStyle(0x7fb0a0, 1)
      g.fillRect(0, PLAY_H, W, GROUND)
      g.fillStyle(0xd9b871, 1)
      g.fillRect(0, PLAY_H, W, 4)

      // bird
      g.fillStyle(0xf4e9cc, 1)
      g.fillCircle(BIRD_X, this.birdY, BIRD_R)
      g.fillStyle(0x0c0d10, 1)
      g.fillCircle(BIRD_X + 4, this.birdY - 3, 2)
    }

    private gameOver(): void {
      if (this.over) return
      this.over = true
      this.draw()
      ctx.onGameOver({ score: this.score, meta: { gaps: this.score } })
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
    scene: FlappyScene,
  })
}
