import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

/**
 * Hill Climb with a custom, stable physics model (no rigid-body engine).
 * Matter's per-segment terrain caught wheels on joints and the suspension
 * resonated, launching the car. This model integrates the car's velocity with
 * real slope-gravity (speeds up downhill, slogs uphill, stalls & rolls back),
 * gives genuine air-time off crests with in-air rotation control, and flips you
 * if you land upside-down — all while staying perfectly stable.
 */

const W = 760
const H = 440
const TERRAIN_BASE = H * 0.6

// Vehicle geometry (screen px).
const CHASSIS_W = 64
const CHASSIS_H = 22
const WHEEL_R = 14
const WHEELBASE = 48
const RIDE = 30 // chassis-centre height above the mean wheel-ground line
const AXLE_DOWN = RIDE - WHEEL_R // chassis-centre → axle, in the car's local frame
const SPAWN_X = 200

// Physics (px, seconds).
const GRAV = 1500 // air gravity
const SLOPE_GRAV = 1150 // how hard gravity drags the car along the slope
// Throttle ramps the LONGER a key is held: a tap is gentle, a sustained hold
// builds up to full power — so acceleration isn't constant.
const ACCEL_BASE = 300 // gas accel at the instant you press
const ACCEL_RAMP = 540 // extra gas accel per second of continuous hold
const BRAKE_BASE = 360 // brake/reverse accel at the instant you press
const BRAKE_RAMP = 540 // extra brake accel per second of hold
const HOLD_MAX = 1.6 // seconds of holding after which the throttle is maxed
const FRICTION = 0.9 // rolling friction (fraction of speed shed per second)
const MAX_V = 470
const MAX_REV = 160
const LAUNCH_FACTOR = 0.62 // crest sharpness × v² beyond which the car takes off
const AIR_CTRL = 3.0 // in-air rotation from gas/brake (rad/s²)
const AIR_SPIN = 1.6 // constant backflip-ward spin applied the whole time airborne (rad/s²)
const FLIP_ANGLE = 2.0 // |angle| beyond this = upside down
const FLIP_HOLD = 480 // ms upside-down on the ground before it's a crash

// Theme palette.
const BG = 0x0c0d10
const ACCENT = 0xe8d6a8
const ACCENT_LIGHT = 0xf4e9cc
const DIRT = 0x3a3526 // dark shade of the accent (app logo) colour — themed terrain
const DIRT_EDGE = 0x8a7c54 // muted gold surface line
const RED = 0xd98a7e
const AMBER = 0xd9b871
const BLUE = 0x8faec4
const TEXT = 0xeceae3
const MUTED = 0x989aa2
const WHEEL_FILL = 0x1a1c20

/** Deterministic, gentle rolling terrain height for a world X. */
function terrainY(x: number): number {
  return (
    TERRAIN_BASE +
    82 * Math.sin(x * 0.0055) +
    42 * Math.sin(x * 0.014) +
    20 * Math.sin(x * 0.032)
  )
}

/** Surface slope dy/dx at a world X (central difference). */
function slopeAt(x: number): number {
  return (terrainY(x + 6) - terrainY(x - 6)) / 12
}

function normAngle(a: number): number {
  let x = a % (Math.PI * 2)
  if (x > Math.PI) x -= Math.PI * 2
  if (x < -Math.PI) x += Math.PI * 2
  return x
}

export const start: GameStarter = (parent, ctx) => {
  class HillClimbScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private hud!: Phaser.GameObjects.Text

    private carX = SPAWN_X
    private carY = 0 // chassis centre, screen y
    private prevY = 0
    private angle = 0
    private v = 0 // speed along the ground (signed)
    private vy = 0 // vertical speed while airborne
    private grounded = true
    private angVel = 0 // angular velocity while airborne
    private wheelSpin = 0 // cosmetic
    private gasHold = 0 // seconds the gas has been held (ramps the throttle)
    private brakeHold = 0 // seconds the brake has been held

    private startX = SPAWN_X
    private distance = 0
    private flipTimer = 0
    private camX = 0
    private camY = 0
    private over = false

    private keyLeft?: Phaser.Input.Keyboard.Key
    private keyRight?: Phaser.Input.Keyboard.Key
    private keyA?: Phaser.Input.Keyboard.Key
    private keyD?: Phaser.Input.Keyboard.Key
    private pointerGas = false
    private pointerBrake = false

    constructor() {
      super('hill-climb')
    }

    create(): void {
      this.g = this.add.graphics()

      this.carX = SPAWN_X
      this.startX = SPAWN_X
      this.angle = Math.atan(slopeAt(SPAWN_X))
      this.carY = (terrainY(SPAWN_X - WHEELBASE / 2) + terrainY(SPAWN_X + WHEELBASE / 2)) / 2 - RIDE
      this.prevY = this.carY
      this.v = 0
      this.vy = 0
      this.grounded = true
      this.angVel = 0
      this.wheelSpin = 0
      this.gasHold = 0
      this.brakeHold = 0
      this.distance = 0
      this.flipTimer = 0
      this.over = false
      this.pointerGas = false
      this.pointerBrake = false
      this.camX = this.carX - W * 0.38
      this.camY = this.carY - H * 0.5

      const kb = this.input.keyboard
      this.keyLeft = kb?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
      this.keyRight = kb?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
      this.keyA = kb?.addKey(Phaser.Input.Keyboard.KeyCodes.A)
      this.keyD = kb?.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.x > W / 2) this.pointerGas = true
        else this.pointerBrake = true
      })
      this.input.on('pointerup', () => {
        this.pointerGas = false
        this.pointerBrake = false
      })

      this.hud = this.add
        .text(12, 10, '0 m', { fontFamily: 'monospace', fontSize: '20px', color: '#eceae3' })
        .setScrollFactor(0)
        .setDepth(10)

      // The scene draws in WORLD coordinates, so the camera must scroll with the
      // car — otherwise the whole drawing drifts off-screen as it drives.
      this.cameras.main.setScroll(this.camX, this.camY)

      ctx.onScore(0)
      this.draw()
    }

    update(_time: number, delta: number): void {
      if (this.over) return
      const dt = Math.min(delta, 40) / 1000
      const gas = !!(this.keyRight?.isDown || this.keyD?.isDown || this.pointerGas)
      const brake = !!(this.keyLeft?.isDown || this.keyA?.isDown || this.pointerBrake)

      if (this.grounded) this.stepGround(dt, gas, brake)
      else this.stepAir(dt, gas, brake)

      // Cosmetic wheel spin tracks ground speed.
      this.wheelSpin += (this.v / WHEEL_R) * dt

      // Distance score.
      const d = Math.floor((this.carX - this.startX) / 12)
      if (d > this.distance) {
        this.distance = d
        ctx.onScore(this.distance)
      }

      // Smooth camera follow.
      const tx = this.carX - W * 0.38
      const ty = this.carY - H * 0.5
      this.camX = Phaser.Math.Linear(this.camX, tx, Math.min(1, 9 * dt))
      this.camY = Phaser.Math.Linear(this.camY, ty, Math.min(1, 5 * dt))
      this.cameras.main.setScroll(this.camX, this.camY)

      this.draw()
    }

    private stepGround(dt: number, gas: boolean, brake: boolean): void {
      const s = slopeAt(this.carX)
      const norm = Math.hypot(1, s)

      // Engine (throttle ramps with how long the key is held) + gravity-along-
      // slope + rolling friction.
      if (gas) {
        this.gasHold = Math.min(this.gasHold + dt, HOLD_MAX)
        this.v += (ACCEL_BASE + ACCEL_RAMP * this.gasHold) * dt
      } else {
        this.gasHold = 0
      }
      if (brake) {
        this.brakeHold = Math.min(this.brakeHold + dt, HOLD_MAX)
        this.v -= (BRAKE_BASE + BRAKE_RAMP * this.brakeHold) * dt
      } else {
        this.brakeHold = 0
      }
      this.v += SLOPE_GRAV * (s / norm) * dt
      this.v -= this.v * FRICTION * dt
      this.v = Phaser.Math.Clamp(this.v, -MAX_REV, MAX_V)

      // Advance along the ground.
      this.carX += (this.v / norm) * dt

      // Sit on the terrain; tilt to match the two wheel contacts.
      const rg = terrainY(this.carX - WHEELBASE / 2)
      const fg = terrainY(this.carX + WHEELBASE / 2)
      this.angle = Math.atan2(fg - rg, WHEELBASE)
      this.prevY = this.carY
      this.carY = (rg + fg) / 2 - RIDE

      // Crest launch: a sharp convex crest taken at speed throws the car into the
      // air. curvature × v² vs gravity decides — gentle crests just hug the ground.
      const curv = (slopeAt(this.carX + 12) - slopeAt(this.carX - 12)) / 24
      if (curv > 0 && this.v * this.v * curv > GRAV * LAUNCH_FACTOR && this.v > 120) {
        this.grounded = false
        this.vy = (this.carY - this.prevY) / dt // carry current vertical momentum
        // A little backflip-ward spin off the ramp (scaled by speed) — gives the
        // car some air character; the player can correct it with in-air control.
        this.angVel = (this.v >= 0 ? -1 : 1) * Math.min(Math.abs(this.v) * 0.0024, 0.9)
      }

      // Sustained upside-down on the ground (very steep) = crash.
      this.checkFlipTimer(dt)
    }

    private stepAir(dt: number, gas: boolean, brake: boolean): void {
      this.carX += (this.v / Math.hypot(1, Math.tan(this.angle))) * dt
      this.vy += GRAV * dt
      this.carY += this.vy * dt

      // A little continuous spin the whole time the car is airborne (backflip-ward
      // by travel direction) so it always has air character.
      this.angVel += (this.v >= 0 ? -1 : 1) * AIR_SPIN * dt
      // In-air rotation control (lean forward/back) lets the player counter it.
      if (gas) this.angVel += AIR_CTRL * dt
      if (brake) this.angVel -= AIR_CTRL * dt
      this.angVel = Phaser.Math.Clamp(this.angVel, -6, 6)
      this.angle += this.angVel * dt

      // Land when the axle line reaches the ground.
      const groundCentre = (terrainY(this.carX - WHEELBASE / 2) + terrainY(this.carX + WHEELBASE / 2)) / 2 - RIDE
      if (this.carY >= groundCentre) {
        this.carY = groundCentre
        this.grounded = true
        this.vy = 0
        this.angVel = 0
        // Landed upside-down → crash. A clean landing just resumes.
        if (Math.abs(normAngle(this.angle)) > FLIP_ANGLE) {
          this.gameOver()
        }
      }
    }

    private checkFlipTimer(dt: number): void {
      if (Math.abs(normAngle(this.angle)) > FLIP_ANGLE) {
        this.flipTimer += dt * 1000
        if (this.flipTimer > FLIP_HOLD) this.gameOver()
      } else {
        this.flipTimer = 0
      }
    }

    private draw(): void {
      const g = this.g
      g.clear()
      const left = this.camX
      const right = this.camX + W
      const top = this.camY

      // Background.
      g.fillStyle(BG, 1)
      g.fillRect(left, top, W, H)

      // Distant parallax ridge.
      g.fillStyle(MUTED, 0.12)
      g.beginPath()
      g.moveTo(left, top + H)
      for (let sx = 0; sx <= W; sx += 20) {
        const wx = left + sx
        const px = this.camX * 0.5 + sx
        const hy = TERRAIN_BASE - 24 + 40 * Math.sin(px * 0.0035)
        g.lineTo(wx, hy)
      }
      g.lineTo(right, top + H)
      g.closePath()
      g.fillPath()

      // Terrain fill (themed dark accent) + gold surface line.
      const baseLine = top + H
      const step = 6
      g.fillStyle(DIRT, 1)
      g.beginPath()
      g.moveTo(left, baseLine)
      for (let sx = 0; sx <= W; sx += step) {
        const wx = left + sx
        g.lineTo(wx, terrainY(wx))
      }
      g.lineTo(right, baseLine)
      g.closePath()
      g.fillPath()

      g.lineStyle(3, DIRT_EDGE, 1)
      g.beginPath()
      for (let sx = 0; sx <= W; sx += step) {
        const wx = left + sx
        if (sx === 0) g.moveTo(wx, terrainY(wx))
        else g.lineTo(wx, terrainY(wx))
      }
      g.strokePath()

      // Start flag.
      if (this.startX > left - 40 && this.startX < right + 40) {
        const fy = terrainY(this.startX)
        g.lineStyle(2, TEXT, 0.7)
        g.beginPath()
        g.moveTo(this.startX, fy)
        g.lineTo(this.startX, fy - 34)
        g.strokePath()
        g.fillStyle(AMBER, 1)
        g.fillTriangle(this.startX, fy - 34, this.startX, fy - 23, this.startX + 15, fy - 28)
      }

      // Car (rigid transform from centre + angle).
      const cx = this.carX
      const cy = this.carY
      const a = this.angle
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      const toWorld = (lx: number, ly: number): Phaser.Geom.Point =>
        new Phaser.Geom.Point(cx + lx * cos - ly * sin, cy + lx * sin + ly * cos)

      // Wheels at the axle line.
      const rear = toWorld(-WHEELBASE / 2, AXLE_DOWN)
      const front = toWorld(WHEELBASE / 2, AXLE_DOWN)
      this.drawWheel(rear.x, rear.y)
      this.drawWheel(front.x, front.y)

      const hw = CHASSIS_W / 2
      const hh = CHASSIS_H / 2
      const poly = (corners: Array<[number, number]>): Phaser.Geom.Point[] =>
        corners.map(([lx, ly]) => toWorld(lx, ly))

      g.fillStyle(ACCENT, 1)
      g.fillPoints(poly([[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]), true)
      g.fillStyle(ACCENT_LIGHT, 1)
      g.fillPoints(poly([[-hw * 0.5, -hh], [hw * 0.55, -hh], [hw * 0.35, -hh - 12], [-hw * 0.15, -hh - 12]]), true)
      const hl = toWorld(hw, -hh * 0.2)
      g.fillStyle(AMBER, 1)
      g.fillCircle(hl.x, hl.y, 3)

      if (!this.grounded || this.flipTimer > 0) {
        g.lineStyle(3, RED, 0.6)
        g.strokeCircle(cx, cy, hw + 8)
      }

      this.hud.setText(`${this.distance} m`)
    }

    private drawWheel(x: number, y: number): void {
      const g = this.g
      g.fillStyle(WHEEL_FILL, 1)
      g.fillCircle(x, y, WHEEL_R)
      g.lineStyle(2, MUTED, 1)
      g.strokeCircle(x, y, WHEEL_R)
      g.fillStyle(BLUE, 1)
      g.fillCircle(x, y, WHEEL_R * 0.32)
      g.lineStyle(2, MUTED, 0.9)
      for (let i = 0; i < 3; i++) {
        const ang = this.wheelSpin + (i * Math.PI * 2) / 3
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + Math.cos(ang) * WHEEL_R * 0.85, y + Math.sin(ang) * WHEEL_R * 0.85)
        g.strokePath()
      }
    }

    private gameOver(): void {
      if (this.over) return
      this.over = true
      ctx.onGameOver({ score: this.distance, meta: {} })
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
    scene: HillClimbScene,
  })
}
