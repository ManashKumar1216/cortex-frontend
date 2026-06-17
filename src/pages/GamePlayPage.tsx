import { useCallback, useEffect, useRef, useState } from 'react'

import { ArrowLeft, Award, RotateCcw, Trophy } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { useGameDetail, useRecordSession, type RecordResult } from '../api/games'
import { PhaserGame } from '../games/engine/PhaserGame'
import type { GameStarter } from '../games/engine/types'
import { GAME_ICONS } from '../games/icons'
import { GAME_BY_SLUG } from '../games/registry'
import { useToast } from '../components/ui'
import { formatBest, formatDuration } from './GamesPage'

type Status = 'loading' | 'playing' | 'over'

export function GamePlayPage() {
  const { slug = '' } = useParams()
  const def = GAME_BY_SLUG[slug]
  const toast = useToast()
  const detail = useGameDetail(slug)
  const record = useRecordSession()

  const [starter, setStarter] = useState<GameStarter | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [status, setStatus] = useState<Status>('loading')
  const [score, setScore] = useState(0)
  const [restartKey, setRestartKey] = useState(0)
  const [result, setResult] = useState<{
    score: number
    meta?: Record<string, unknown>
    record: RecordResult | null
  } | null>(null)
  const startedAt = useRef<number>(0)

  // Lazy-load the scene module for this game.
  useEffect(() => {
    if (!def) return
    let alive = true
    setStarter(null)
    setLoadError(false)
    def
      .load()
      .then((m) => {
        if (!alive) return
        setStarter(() => m.start)
        startedAt.current = Date.now()
        setStatus('playing')
      })
      .catch(() => alive && setLoadError(true))
    return () => {
      alive = false
    }
  }, [def, slug])

  const onScore = useCallback((s: number) => setScore(s), [])

  const onGameOver = useCallback(
    (r: { score: number; meta?: Record<string, unknown> }) => {
      const durationMs = Date.now() - startedAt.current
      setStatus('over')
      setScore(r.score)
      record.mutate(
        { slug, score: r.score, durationMs, meta: r.meta },
        {
          onSuccess: (res) => {
            setResult({ score: r.score, meta: r.meta, record: res })
            if (res.isHighScore) toast.show('🏆 New high score!')
            for (const a of res.newAchievements) toast.show(`🏅 Achievement: ${a.label}`)
          },
          onError: () => setResult({ score: r.score, meta: r.meta, record: null }),
        },
      )
    },
    [record, slug, toast],
  )

  const playAgain = () => {
    setResult(null)
    setScore(0)
    startedAt.current = Date.now()
    setStatus('playing')
    setRestartKey((k) => k + 1)
  }

  if (!def) {
    return (
      <div>
        <Link to="/games" className="games-back">
          <ArrowLeft size={15} /> Games
        </Link>
        <p className="error">No such game.</p>
      </div>
    )
  }

  const d = detail.data

  return (
    <div className="game-play">
      <div className="game-play-bar">
        <Link to="/games" className="games-back">
          <ArrowLeft size={15} /> Games
        </Link>
        <span className="game-play-title">
          <span className="game-play-icon" aria-hidden="true">
            {GAME_ICONS[def.slug]}
          </span>{' '}
          {def.title}
        </span>
        <span className="game-play-score mono">
          Score <strong>{score.toLocaleString()}</strong>
        </span>
        {d?.best != null && (
          <span className="game-play-best mono">
            Best {formatBest({ best: d.best, higherIsBetter: def.higherIsBetter, scoreLabel: d.scoreLabel })}
          </span>
        )}
        <button className="btn ghost sm" onClick={playAgain} title="Restart">
          <RotateCcw size={14} /> Restart
        </button>
      </div>

      <div className="game-stage">
        {loadError && <p className="error">Couldn’t load this game.</p>}
        {!loadError && !starter && <p className="muted">Loading game…</p>}
        {starter && (
          <PhaserGame
            starter={starter}
            onScore={onScore}
            onGameOver={onGameOver}
            restartKey={restartKey}
          />
        )}

        {status === 'over' && result && (() => {
          const won = result.meta?.win === true
          const durationSec =
            typeof result.meta?.durationSec === 'number' ? result.meta.durationSec : null
          // Clear-time games (lower-is-better) record a loss as score 0; show how long
          // the player lasted instead of a meaningless "0 s".
          const showSurvival = !def.higherIsBetter && result.score === 0 && durationSec != null
          const value = showSurvival ? durationSec : result.score
          const unit = def.higherIsBetter ? '' : 's'
          const caption = won ? 'Cleared!' : showSurvival ? 'Survived' : null
          return (
          <div className="game-over-overlay">
            <div className="game-over-card">
              <h2>Game over</h2>
              <p className="game-over-score">
                {value.toLocaleString()} {unit}
              </p>
              {caption && <p className="game-over-outcome muted small">{caption}</p>}
              {result.record?.isHighScore && (
                <p className="game-over-high">
                  <Trophy size={15} /> New personal best!
                </p>
              )}
              {result.record && result.record.newAchievements.length > 0 && (
                <div className="game-over-ach">
                  {result.record.newAchievements.map((a) => (
                    <span key={a.key} className="ach-pill">
                      <Award size={12} /> {a.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="game-over-actions">
                <button className="btn primary" onClick={playAgain}>
                  <RotateCcw size={15} /> Play again
                </button>
                <Link to="/games" className="btn ghost">
                  Back to arcade
                </Link>
              </div>
            </div>
          </div>
          )
        })()}
      </div>

      <p className="muted small game-controls">Controls: {def.controls}</p>

      {d && (
        <div className="game-records">
          <section className="card game-records-col">
            <h3 className="game-records-title">Recent runs</h3>
            {d.recent.length === 0 ? (
              <p className="muted small">No runs yet — play one!</p>
            ) : (
              <ul className="game-runs">
                {d.recent.map((r, i) => (
                  <li key={i}>
                    <span className="mono game-run-score">
                      {def.higherIsBetter ? r.score.toLocaleString() : `${r.score}s`}
                    </span>
                    <span className="muted small">{formatDuration(r.durationMs)}</span>
                    <span className="muted small game-run-when">
                      {new Date(r.playedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card game-records-col">
            <h3 className="game-records-title">
              Achievements{' '}
              <span className="muted small">
                {d.achievements.filter((a) => a.unlocked).length}/{d.achievements.length}
              </span>
            </h3>
            <div className="ach-grid">
              {d.achievements.map((a) => (
                <div key={a.key} className={`ach-item${a.unlocked ? ' unlocked' : ''}`} title={a.description}>
                  <Award size={14} />
                  <div>
                    <span className="ach-label">{a.label}</span>
                    <span className="muted small ach-desc">{a.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
