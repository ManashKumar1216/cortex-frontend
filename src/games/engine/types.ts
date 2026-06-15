import type Phaser from 'phaser'

/** The bridge a Phaser scene uses to report back to React. */
export interface GameContext {
  /** Push the live score to the HUD. */
  onScore: (score: number) => void
  /** Signal the run is finished with its final score (+ optional per-game extras). */
  onGameOver: (result: { score: number; meta?: Record<string, unknown> }) => void
}

/** Each game module exports `start`: boot a Phaser.Game into `parent`. */
export type GameStarter = (parent: HTMLElement, ctx: GameContext) => Phaser.Game

/** Catalog entry used to render cards + lazy-load the scene. */
export interface GameDef {
  slug: string
  title: string
  blurb: string
  controls: string
  category: 'arcade' | 'puzzle' | 'shooter' | 'runner'
  /** Lower-is-better games (e.g. Minesweeper clear time) format their best differently. */
  higherIsBetter: boolean
  /** Lazy import of the scene module. */
  load: () => Promise<{ start: GameStarter }>
}
