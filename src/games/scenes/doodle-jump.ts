import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const W = 400
const H = 600
const GRAVITY = 0.0022 // px per ms^2
const JUMP = -0.95 // px per ms (impulse)
const MOVE = 0.32 // horizontal speed px per ms
const PLAT_W = 70
const PLAT_H = 14
const PLAT_COUNT = 9
const CHAR_W = 34
const CHAR_H = 38
const SCROLL_LINE = H * 0.42 // when char rises above this, scroll the world down

type Platform = { x: number; y: number; moving: boolean; vx: number }

export const start: GameStarter = (parent, ctx) => {
  class DoodleJumpScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private label!: Phaser.GameObjects.Text
    private platforms: Platform[] = []
    private cx = W / 2
    private cy = H - 120
    private vy = 0
    private dir = 0 // -1 left, 1 right, 0 none
    private touchDir = 0
    private climbed = 0 // total world distance scrolled (height climbed)
    private score = 0
    private over = false

    constructor() {
      super('doodle-jump')
    }

    create(): void {
      this.g = this.add.graphics()
      this.label = this.add
        .text(12, 12, '0 m', { fontFamily: 'monospace', fontSize: '20px', color: '#eceae3' })
        .setDepth(10)

      this.platforms = []
      this.cx = W / 2
      this.cy = H - 120
      this.vy = JUMP
      this.dir = 0
      this.touchDir = 0
      this.climbed = 0
      this.score = 0
      this.over = false
      ctx.onScore(0)

      // Seed platforms up the level, evenly spaced so a jump can reach the next.
      const gap = H / PLAT_COUNT
      for (let i = 0; i < PLAT_COUNT; i++) {
        const y = H - 40 - i * gap
        this.platforms.push(this.makePlatform(Phaser.Math.Between(0, W - PLAT_W), y, false))
      }
      // Guarantee a platform directly under the starting character.
      this.platforms[0] = this.makePlatform(this.cx - PLAT_W / 2, this.cy + CHAR_H / 2 + 4, false)

      this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
        const k = e.key
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.dir = -1
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.dir = 1
      })
      this.input.keyboard?.on('keyup', (e: KeyboardEvent) => {
        const k = e.key
        if ((k === 'ArrowLeft' || k === 'a' || k === 'A') && this.dir === -1) this.dir = 0
        else if ((k === 'ArrowRight' || k === 'd' || k === 'D') && this.dir === 1) this.dir = 0
      })

      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.touchDir = p.x < W / 2 ? -1 : 1
      })
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (p.isDown) this.touchDir = p.x < W / 2 ? -1 : 1
      })
      this.input.on('pointerup', () => {
        this.touchDir = 0
      })

      this.draw()
    }

    private makePlatform(x: number, y: number, moving: boolean): Platform {
      return {
        x: Phaser.Math.Clamp(x, 0, W - PLAT_W),
        y,
        moving,
        vx: moving ? (Phaser.Math.Between(0, 1) ? 0.06 : -0.06) : 0,
      }
    }

    private spawnTop(): Platform {
      // Harder with height: occasional moving platforms once climbed a bit.
      const moving = this.climbed > 600 && Phaser.Math.Between(0, 4) === 0
      // Slightly wider vertical gaps as we climb (capped to remain reachable).
      const spread = Phaser.Math.Between(50, Math.min(120, 60 + this.climbed / 60))
      const top = Math.min(...this.platforms.map((p) => p.y))
      return this.makePlatform(Phaser.Math.Between(0, W - PLAT_W), top - spread, moving)
    }

    update(_time: number, delta: number): void {
      if (this.over) return
      const dt = Math.min(delta, 40) // clamp huge frame gaps

      // Horizontal movement (keyboard takes priority, else touch).
      const move = this.dir !== 0 ? this.dir : this.touchDir
      this.cx += move * MOVE * dt
      // Wrap horizontally.
      if (this.cx < -CHAR_W / 2) this.cx = W + CHAR_W / 2
      else if (this.cx > W + CHAR_W / 2) this.cx = -CHAR_W / 2

      // Vertical physics.
      this.vy += GRAVITY * dt
      this.cy += this.vy * dt

      // Move any moving platforms.
      for (const p of this.platforms) {
        if (!p.moving) continue
        p.x += p.vx * dt
        if (p.x <= 0) {
          p.x = 0
          p.vx = Math.abs(p.vx)
        } else if (p.x >= W - PLAT_W) {
          p.x = W - PLAT_W
          p.vx = -Math.abs(p.vx)
        }
      }

      // Bounce when falling onto a platform from above.
      if (this.vy > 0) {
        const feet = this.cy + CHAR_H / 2
        const prevFeet = feet - this.vy * dt
        for (const p of this.platforms) {
          const top = p.y
          const withinX = this.cx + CHAR_W / 2 > p.x && this.cx - CHAR_W / 2 < p.x + PLAT_W
          if (withinX && prevFeet <= top && feet >= top) {
            this.vy = JUMP
            this.cy = top - CHAR_H / 2
            break
          }
        }
      }

      // Scroll the world when the character climbs above the scroll line.
      if (this.cy < SCROLL_LINE) {
        const shift = SCROLL_LINE - this.cy
        this.cy = SCROLL_LINE
        this.climbed += shift
        for (const p of this.platforms) p.y += shift
        // Recycle platforms that fell off the bottom.
        for (let i = 0; i < this.platforms.length; i++) {
          if (this.platforms[i].y > H + PLAT_H) this.platforms[i] = this.spawnTop()
        }
        const m = Math.floor(this.climbed / 10)
        if (m > this.score) {
          this.score = m
          ctx.onScore(this.score)
        }
      }

      // Game over: fell below the bottom of the screen.
      if (this.cy - CHAR_H / 2 > H) {
        this.gameOver()
        return
      }

      this.label.setText(`${this.score} m`)
      this.draw()
    }

    private draw(): void {
      const g = this.g
      g.clear()
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      // Platforms.
      for (const p of this.platforms) {
        g.fillStyle(p.moving ? 0xd9b871 : 0x7fb0a0, 1)
        g.fillRoundedRect(p.x, p.y, PLAT_W, PLAT_H, 5)
      }

      // Character (accent blob with a small face).
      const x = this.cx - CHAR_W / 2
      const y = this.cy - CHAR_H / 2
      g.fillStyle(0xe8d6a8, 1)
      g.fillRoundedRect(x, y, CHAR_W, CHAR_H, 10)
      // Eyes.
      g.fillStyle(0x0c0d10, 1)
      g.fillCircle(this.cx - 7, this.cy - 6, 3)
      g.fillCircle(this.cx + 7, this.cy - 6, 3)
      // Mouth.
      g.fillStyle(0xd98a7e, 1)
      g.fillRoundedRect(this.cx - 6, this.cy + 5, 12, 4, 2)

      // Wrap ghost: draw character peeking from the opposite edge while wrapping.
      if (x < 0) {
        g.fillStyle(0xf4e9cc, 1)
        g.fillRoundedRect(x + W + CHAR_W, y, CHAR_W, CHAR_H, 10)
      } else if (x + CHAR_W > W) {
        g.fillStyle(0xf4e9cc, 1)
        g.fillRoundedRect(x - W - CHAR_W, y, CHAR_W, CHAR_H, 10)
      }
    }

    private gameOver(): void {
      this.over = true
      ctx.onGameOver({ score: this.score, meta: { climbed: Math.floor(this.climbed) } })
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
    scene: DoodleJumpScene,
  })
}
