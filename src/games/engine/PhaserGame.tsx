import { useEffect, useRef } from 'react'

import type Phaser from 'phaser'

import type { GameContext, GameStarter } from './types'

interface Props {
  starter: GameStarter
  onScore: (score: number) => void
  onGameOver: (result: { score: number; meta?: Record<string, unknown> }) => void
  /** Bump to tear down + recreate the game (Play again). */
  restartKey: number
}

const CAPTURE_KEYS = 'SPACE,UP,DOWN,LEFT,RIGHT,W,A,S,D'

/**
 * Mounts a Phaser game into a div and bridges its events to React. The score /
 * game-over callbacks are read through a ref so the game is only torn down when
 * the starter or restartKey changes — not on every parent re-render.
 */
export function PhaserGame({ starter, onScore, onGameOver, restartKey }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const cbRef = useRef({ onScore, onGameOver })
  cbRef.current = { onScore, onGameOver }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const ctx: GameContext = {
      onScore: (s) => cbRef.current.onScore(s),
      onGameOver: (r) => cbRef.current.onGameOver(r),
    }
    const game: Phaser.Game = starter(host, ctx)

    // Stop Space/Arrows from scrolling the page via Phaser's OWN key capture: it
    // preventDefaults the game keys *after* processing them, so controls keep
    // working AND the page never scrolls. (A separate window listener that
    // preventDefaults BEFORE Phaser trips its `defaultPrevented` early-out and
    // silently eats every key — so we deliberately don't do that.) Applied once
    // Phaser has booted ('ready', by which point the scene's keyboard is live).
    const applyCapture = (): void => {
      game.scene.getScenes(true).forEach((s) => s.input?.keyboard?.addCapture(CAPTURE_KEYS))
    }
    game.events.once('ready', applyCapture)

    return () => {
      game.destroy(true)
    }
  }, [starter, restartKey])

  return <div ref={hostRef} className="phaser-host" />
}
