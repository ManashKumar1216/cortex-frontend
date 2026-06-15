import Phaser from 'phaser'

import type { GameStarter } from '../engine/types'

const COLS = 20
const ROWS = 24
const CELL = 24
const W = COLS * CELL
const H = ROWS * CELL

// Play-field look. The field sits on `--surface` so it reads as a distinct
// board against the darker stage, ringed by a clearly visible wall — the edge
// the snake dies on must be obvious.
const FIELD = 0x121316 // --surface
const WALL = 0x4a4d55 // a touch brighter than --border-strong so the boundary pops
const WALL_W = 3

type Vec = { x: number; y: number }

export const start: GameStarter = (parent, ctx) => {
  class SnakeScene extends Phaser.Scene {
    private snake: Vec[] = []
    private dir: Vec = { x: 1, y: 0 }
    private nextDir: Vec = { x: 1, y: 0 }
    private food: Vec = { x: 0, y: 0 }
    private score = 0
    private moveTimer = 0
    private stepMs = 130
    private over = false
    private g!: Phaser.GameObjects.Graphics

    constructor() {
      super('snake')
    }

    create(): void {
      this.g = this.add.graphics()
      this.snake = [
        { x: 6, y: 12 },
        { x: 5, y: 12 },
        { x: 4, y: 12 },
      ]
      this.dir = { x: 1, y: 0 }
      this.nextDir = { x: 1, y: 0 }
      this.score = 0
      this.stepMs = 130
      this.over = false
      ctx.onScore(0)
      this.placeFood()

      this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
        const k = e.key
        if (k === 'ArrowUp' || k === 'w') this.turn({ x: 0, y: -1 })
        else if (k === 'ArrowDown' || k === 's') this.turn({ x: 0, y: 1 })
        else if (k === 'ArrowLeft' || k === 'a') this.turn({ x: -1, y: 0 })
        else if (k === 'ArrowRight' || k === 'd') this.turn({ x: 1, y: 0 })
      })

      let sx = 0
      let sy = 0
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        sx = p.x
        sy = p.y
      })
      this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
        const dx = p.x - sx
        const dy = p.y - sy
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return
        if (Math.abs(dx) > Math.abs(dy)) this.turn({ x: dx > 0 ? 1 : -1, y: 0 })
        else this.turn({ x: 0, y: dy > 0 ? 1 : -1 })
      })

      this.draw()
    }

    private turn(d: Vec): void {
      if (d.x === -this.dir.x && d.y === -this.dir.y) return
      this.nextDir = d
    }

    private placeFood(): void {
      for (;;) {
        const f = { x: Phaser.Math.Between(0, COLS - 1), y: Phaser.Math.Between(0, ROWS - 1) }
        if (!this.snake.some((s) => s.x === f.x && s.y === f.y)) {
          this.food = f
          return
        }
      }
    }

    update(_time: number, delta: number): void {
      if (this.over) return
      this.moveTimer += delta
      if (this.moveTimer < this.stepMs) return
      this.moveTimer = 0
      this.dir = this.nextDir

      const head: Vec = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y }
      if (
        head.x < 0 ||
        head.x >= COLS ||
        head.y < 0 ||
        head.y >= ROWS ||
        this.snake.some((s) => s.x === head.x && s.y === head.y)
      ) {
        this.gameOver()
        return
      }
      this.snake.unshift(head)
      if (head.x === this.food.x && head.y === this.food.y) {
        this.score += 1
        ctx.onScore(this.score)
        this.stepMs = Math.max(60, this.stepMs - 2)
        this.placeFood()
      } else {
        this.snake.pop()
      }
      this.draw()
    }

    private draw(): void {
      const g = this.g
      g.clear()
      // play field
      g.fillStyle(FIELD, 1)
      g.fillRect(0, 0, W, H)
      // walls — an inset frame so the boundary is clearly visible
      g.lineStyle(WALL_W, WALL, 1)
      g.strokeRect(WALL_W / 2, WALL_W / 2, W - WALL_W, H - WALL_W)
      // food
      g.fillStyle(0xd98a7e, 1)
      g.fillRect(this.food.x * CELL + 3, this.food.y * CELL + 3, CELL - 6, CELL - 6)
      // snake
      this.snake.forEach((s, i) => {
        g.fillStyle(i === 0 ? 0xe8d6a8 : 0x7fb0a0, 1)
        g.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
      })
    }

    private gameOver(): void {
      this.over = true
      ctx.onGameOver({ score: this.score, meta: { length: this.snake.length } })
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
    scene: SnakeScene,
  })
}
