import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const W = 560
const H = 480

const COLS = 8
const ROWS = 5
const INV_W = 28
const INV_H = 18
const GAP_X = 38
const GAP_Y = 30
const FORM_TOP = 60
const FORM_LEFT = 50

const SHIP_W = 36
const SHIP_H = 14
const SHIP_Y = H - 36
const SHIP_SPEED = 5

const BULLET_W = 3
const BULLET_H = 12
const BULLET_SPEED = 7
const BOMB_W = 4
const BOMB_H = 12
const BOMB_SPEED = 3.2
const FIRE_COOLDOWN = 280

const ROW_COLORS = [0xd98a7e, 0xd9b871, 0xd9b871, 0x8faec4, 0x8faec4]
const ROW_SCORES = [30, 20, 20, 10, 10]

type Invader = { x: number; y: number; row: number; alive: boolean }
type Shot = { x: number; y: number }

export const start: GameStarter = (parent, ctx) => {
  class SpaceInvadersScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private hud!: Phaser.GameObjects.Text

    private invaders: Invader[] = []
    private bullets: Shot[] = []
    private bombs: Shot[] = []

    private shipX = W / 2
    private lives = 3
    private score = 0
    private wave = 1
    private over = false

    private dir = 1
    private formSpeed = 1
    private moveTimer = 0
    private stepMs = 600
    private bombTimer = 0
    private bombMs = 1100
    private lastFire = 0
    private respawnUntil = 0

    private left!: Phaser.Input.Keyboard.Key
    private right!: Phaser.Input.Keyboard.Key
    private fire!: Phaser.Input.Keyboard.Key

    constructor() {
      super('space-invaders')
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
      this.wave = 1
      this.over = false
      this.shipX = W / 2
      ctx.onScore(0)

      const kb = this.input.keyboard
      this.left = kb!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
      this.right = kb!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
      this.fire = kb!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

      this.spawnWave()
      this.draw()
    }

    private spawnWave(): void {
      this.invaders = []
      const drop = (this.wave - 1) * GAP_Y
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          this.invaders.push({
            x: FORM_LEFT + c * GAP_X,
            y: FORM_TOP + drop + r * GAP_Y,
            row: r,
            alive: true,
          })
        }
      }
      this.bullets = []
      this.bombs = []
      this.dir = 1
      this.moveTimer = 0
      this.bombTimer = 0
      this.stepMs = Math.max(180, 600 - (this.wave - 1) * 80)
      this.recomputeSpeed()
    }

    private recomputeSpeed(): void {
      const total = ROWS * COLS
      const alive = this.invaders.filter((i) => i.alive).length
      const ratio = alive / total
      // fewer invaders => bigger horizontal step + shorter interval
      this.formSpeed = 6 + (1 - ratio) * 14
      this.stepMs = Math.max(90, (180 + ratio * 420) - (this.wave - 1) * 40)
    }

    update(time: number, delta: number): void {
      if (this.over) return

      // ship movement
      if (this.left.isDown) this.shipX -= SHIP_SPEED
      if (this.right.isDown) this.shipX += SHIP_SPEED
      this.shipX = Phaser.Math.Clamp(this.shipX, SHIP_W / 2, W - SHIP_W / 2)

      // firing (cooldown + max 2 bullets)
      if (this.fire.isDown && this.bullets.length < 2 && time - this.lastFire > FIRE_COOLDOWN) {
        this.bullets.push({ x: this.shipX, y: SHIP_Y - SHIP_H })
        this.lastFire = time
      }

      // formation step
      this.moveTimer += delta
      if (this.moveTimer >= this.stepMs) {
        this.moveTimer = 0
        this.stepFormation()
      }

      // bombs drop
      this.bombTimer += delta
      if (this.bombTimer >= this.bombMs) {
        this.bombTimer = 0
        this.dropBomb()
      }

      this.moveShots()
      this.checkCollisions(time)
      this.draw()
    }

    private stepFormation(): void {
      let minX = Infinity
      let maxX = -Infinity
      for (const inv of this.invaders) {
        if (!inv.alive) continue
        if (inv.x < minX) minX = inv.x
        if (inv.x + INV_W > maxX) maxX = inv.x + INV_W
      }
      if (minX === Infinity) return

      const next = minX + this.dir * this.formSpeed
      const nextRight = maxX + this.dir * this.formSpeed
      if (next < 8 || nextRight > W - 8) {
        // hit edge: step down and reverse
        this.dir *= -1
        for (const inv of this.invaders) {
          if (inv.alive) inv.y += 14
        }
      } else {
        for (const inv of this.invaders) {
          if (inv.alive) inv.x += this.dir * this.formSpeed
        }
      }

      // invader reached player's row => immediate game over
      for (const inv of this.invaders) {
        if (inv.alive && inv.y + INV_H >= SHIP_Y - SHIP_H) {
          this.gameOver()
          return
        }
      }
    }

    private dropBomb(): void {
      const alive = this.invaders.filter((i) => i.alive)
      if (alive.length === 0) return
      const shooter = alive[Phaser.Math.Between(0, alive.length - 1)]
      this.bombs.push({ x: shooter.x + INV_W / 2, y: shooter.y + INV_H })
    }

    private moveShots(): void {
      for (const b of this.bullets) b.y -= BULLET_SPEED
      this.bullets = this.bullets.filter((b) => b.y + BULLET_H > 0)
      for (const b of this.bombs) b.y += BOMB_SPEED
      this.bombs = this.bombs.filter((b) => b.y < H)
    }

    private checkCollisions(time: number): void {
      // bullets vs invaders
      for (const b of this.bullets) {
        for (const inv of this.invaders) {
          if (!inv.alive) continue
          if (
            b.x >= inv.x &&
            b.x <= inv.x + INV_W &&
            b.y <= inv.y + INV_H &&
            b.y + BULLET_H >= inv.y
          ) {
            inv.alive = false
            b.y = -100 // mark for removal
            this.score += ROW_SCORES[inv.row]
            ctx.onScore(this.score)
            this.recomputeSpeed()
            break
          }
        }
      }
      this.bullets = this.bullets.filter((b) => b.y + BULLET_H > 0)

      // wave cleared
      if (this.invaders.every((i) => !i.alive)) {
        this.wave += 1
        this.spawnWave()
        return
      }

      // bombs vs ship (skip during respawn invulnerability)
      if (time >= this.respawnUntil) {
        const shipLeft = this.shipX - SHIP_W / 2
        const shipRight = this.shipX + SHIP_W / 2
        const shipTop = SHIP_Y - SHIP_H
        for (const bomb of this.bombs) {
          if (
            bomb.x + BOMB_W >= shipLeft &&
            bomb.x <= shipRight &&
            bomb.y + BOMB_H >= shipTop &&
            bomb.y <= SHIP_Y
          ) {
            bomb.y = H + 100 // remove
            this.hitShip(time)
            break
          }
        }
        this.bombs = this.bombs.filter((b) => b.y < H)
      }
    }

    private hitShip(time: number): void {
      this.lives -= 1
      if (this.lives <= 0) {
        this.gameOver()
        return
      }
      // brief respawn invulnerability + recenter
      this.respawnUntil = time + 1200
      this.shipX = W / 2
      this.bombs = []
    }

    private draw(): void {
      const g = this.g
      g.clear()
      g.fillStyle(0x0c0d10, 1)
      g.fillRect(0, 0, W, H)

      // invaders
      for (const inv of this.invaders) {
        if (!inv.alive) continue
        g.fillStyle(ROW_COLORS[inv.row], 1)
        g.fillRect(inv.x, inv.y, INV_W, INV_H)
        // little eyes for character
        g.fillStyle(0x0c0d10, 1)
        g.fillRect(inv.x + 6, inv.y + 6, 4, 4)
        g.fillRect(inv.x + INV_W - 10, inv.y + 6, 4, 4)
      }

      // bullets
      g.fillStyle(0xf4e9cc, 1)
      for (const b of this.bullets) g.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H)

      // bombs
      g.fillStyle(0xd98a7e, 1)
      for (const b of this.bombs) g.fillRect(b.x - BOMB_W / 2, b.y, BOMB_W, BOMB_H)

      // ship (blink during respawn)
      const blink = this.time.now < this.respawnUntil && Math.floor(this.time.now / 120) % 2 === 0
      if (!blink) {
        g.fillStyle(0xe8d6a8, 1)
        g.fillRect(this.shipX - SHIP_W / 2, SHIP_Y - SHIP_H, SHIP_W, SHIP_H)
        g.fillRect(this.shipX - 3, SHIP_Y - SHIP_H - 6, 6, 6)
      }

      this.hud.setText(`SCORE ${this.score}   LIVES ${this.lives}   WAVE ${this.wave}`)
    }

    private gameOver(): void {
      if (this.over) return
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
    scene: SpaceInvadersScene,
  })
}
