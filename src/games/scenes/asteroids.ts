import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const W = 640
const H = 480

const MAX_SPEED = 260
const THRUST = 320
const DRAG = 0.6
const ROT_SPEED = 4.2
const BULLET_SPEED = 460
const BULLET_LIFE = 1000
const FIRE_COOLDOWN = 220
const INVULN_MS = 1500

type Asteroid = { x: number; y: number; vx: number; vy: number; r: number; size: number }
type Bullet = { x: number; y: number; vx: number; vy: number; life: number }

const sizeRadius = (size: number): number => (size === 3 ? 40 : size === 2 ? 24 : 12)

export const start: GameStarter = (parent, ctx) => {
  class AsteroidsScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private livesText!: Phaser.GameObjects.Text
    private waveText!: Phaser.GameObjects.Text
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
    private fireKey?: Phaser.Input.Keyboard.Key

    private shipX = W / 2
    private shipY = H / 2
    private shipAngle = -Math.PI / 2
    private vx = 0
    private vy = 0

    private bullets: Bullet[] = []
    private asteroids: Asteroid[] = []

    private score = 0
    private lives = 3
    private wave = 1
    private fireTimer = 0
    private invuln = 0
    private over = false

    constructor() {
      super('asteroids')
    }

    create(): void {
      this.g = this.add.graphics()
      this.cursors = this.input.keyboard?.createCursorKeys()
      this.fireKey = this.input.keyboard?.addKey('SPACE')

      this.score = 0
      this.lives = 3
      this.wave = 1
      this.over = false
      this.bullets = []
      this.fireTimer = 0
      this.resetShip()
      this.spawnWave()
      ctx.onScore(0)

      this.livesText = this.add.text(10, 8, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#eceae3',
      })
      this.waveText = this.add.text(W - 10, 8, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#989aa2',
      })
      this.waveText.setOrigin(1, 0)
      this.updateHud()

      this.draw()
    }

    private resetShip(): void {
      this.shipX = W / 2
      this.shipY = H / 2
      this.shipAngle = -Math.PI / 2
      this.vx = 0
      this.vy = 0
      this.invuln = INVULN_MS
    }

    private spawnWave(): void {
      const count = 4 + (this.wave - 1)
      this.asteroids = []
      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(0, 1) === 0 ? 0 : W
        const y = Phaser.Math.Between(0, H)
        this.asteroids.push(this.makeAsteroid(x, y, 3))
      }
    }

    private makeAsteroid(x: number, y: number, size: number): Asteroid {
      const speed = Phaser.Math.Between(30, 70) + (4 - size) * 10
      const dir = Phaser.Math.FloatBetween(0, Math.PI * 2)
      return {
        x,
        y,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        r: sizeRadius(size),
        size,
      }
    }

    private wrap(o: { x: number; y: number }): void {
      if (o.x < 0) o.x += W
      else if (o.x >= W) o.x -= W
      if (o.y < 0) o.y += H
      else if (o.y >= H) o.y -= H
    }

    private fire(): void {
      this.bullets.push({
        x: this.shipX + Math.cos(this.shipAngle) * 14,
        y: this.shipY + Math.sin(this.shipAngle) * 14,
        vx: Math.cos(this.shipAngle) * BULLET_SPEED,
        vy: Math.sin(this.shipAngle) * BULLET_SPEED,
        life: BULLET_LIFE,
      })
      this.fireTimer = FIRE_COOLDOWN
    }

    update(_time: number, delta: number): void {
      if (this.over) return
      const dt = delta / 1000

      if (this.invuln > 0) this.invuln -= delta
      if (this.fireTimer > 0) this.fireTimer -= delta

      const c = this.cursors
      if (c) {
        if (c.left.isDown) this.shipAngle -= ROT_SPEED * dt
        else if (c.right.isDown) this.shipAngle += ROT_SPEED * dt
        if (c.up.isDown) {
          this.vx += Math.cos(this.shipAngle) * THRUST * dt
          this.vy += Math.sin(this.shipAngle) * THRUST * dt
        }
      }
      if (this.fireKey?.isDown && this.fireTimer <= 0) this.fire()

      // drag + clamp
      const dragF = 1 - DRAG * dt
      this.vx *= dragF
      this.vy *= dragF
      const sp = Math.hypot(this.vx, this.vy)
      if (sp > MAX_SPEED) {
        this.vx = (this.vx / sp) * MAX_SPEED
        this.vy = (this.vy / sp) * MAX_SPEED
      }
      this.shipX += this.vx * dt
      this.shipY += this.vy * dt
      const ship = { x: this.shipX, y: this.shipY }
      this.wrap(ship)
      this.shipX = ship.x
      this.shipY = ship.y

      // bullets
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i]
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.life -= delta
        this.wrap(b)
        if (b.life <= 0) this.bullets.splice(i, 1)
      }

      // asteroids
      for (const a of this.asteroids) {
        a.x += a.vx * dt
        a.y += a.vy * dt
        this.wrap(a)
      }

      this.checkBulletHits()
      this.checkShipHit()

      if (this.asteroids.length === 0) {
        this.wave += 1
        this.spawnWave()
        this.updateHud()
      }

      this.draw()
    }

    private checkBulletHits(): void {
      for (let i = this.asteroids.length - 1; i >= 0; i--) {
        const a = this.asteroids[i]
        for (let j = this.bullets.length - 1; j >= 0; j--) {
          const b = this.bullets[j]
          if (Math.hypot(a.x - b.x, a.y - b.y) <= a.r) {
            this.bullets.splice(j, 1)
            this.asteroids.splice(i, 1)
            this.score += a.size === 3 ? 20 : a.size === 2 ? 50 : 100
            ctx.onScore(this.score)
            if (a.size > 1) {
              const ns = a.size - 1
              for (let k = 0; k < 2; k++) {
                const child = this.makeAsteroid(a.x, a.y, ns)
                this.asteroids.push(child)
              }
            }
            break
          }
        }
      }
    }

    private checkShipHit(): void {
      if (this.invuln > 0) return
      for (const a of this.asteroids) {
        if (Math.hypot(a.x - this.shipX, a.y - this.shipY) <= a.r + 10) {
          this.lives -= 1
          this.updateHud()
          if (this.lives <= 0) {
            this.gameOver()
            return
          }
          this.resetShip()
          return
        }
      }
    }

    private updateHud(): void {
      this.livesText.setText(`Lives ${this.lives}`)
      this.waveText.setText(`Wave ${this.wave}`)
    }

    private drawShip(): void {
      if (this.invuln > 0 && Math.floor(this.invuln / 120) % 2 === 0) return
      const g = this.g
      const a = this.shipAngle
      const nose = { x: this.shipX + Math.cos(a) * 16, y: this.shipY + Math.sin(a) * 16 }
      const back = a + Math.PI
      const left = {
        x: this.shipX + Math.cos(back - 0.45) * 13,
        y: this.shipY + Math.sin(back - 0.45) * 13,
      }
      const right = {
        x: this.shipX + Math.cos(back + 0.45) * 13,
        y: this.shipY + Math.sin(back + 0.45) * 13,
      }
      g.lineStyle(2, 0xf4e9cc, 1)
      g.beginPath()
      g.moveTo(nose.x, nose.y)
      g.lineTo(left.x, left.y)
      g.lineTo(right.x, right.y)
      g.closePath()
      g.strokePath()
    }

    private draw(): void {
      const g = this.g
      g.clear()
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      // bullets
      g.fillStyle(0xd9b871, 1)
      for (const b of this.bullets) g.fillCircle(b.x, b.y, 2)

      // asteroids
      g.lineStyle(2, 0x8faec4, 1)
      for (const a of this.asteroids) {
        g.strokeCircle(a.x, a.y, a.r)
      }

      // ship
      this.drawShip()
    }

    private gameOver(): void {
      this.over = true
      ctx.onGameOver({ score: this.score, meta: { wave: this.wave } })
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
    scene: AsteroidsScene,
  })
}
