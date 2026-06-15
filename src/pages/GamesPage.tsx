import { Award, Clock, Flame, Gamepad2, Play, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useGamesSummary, type GameSummaryRow } from '../api/games'
import { GAME_ICONS } from '../games/icons'
import { GAMES } from '../games/registry'
import { PageHeader } from '../components/ui'

/** Format a best score, accounting for lower-is-better (time) games. */
export function formatBest(row: { best: number | null; higherIsBetter: boolean; scoreLabel: string }): string {
  if (row.best == null) return '—'
  if (!row.higherIsBetter) return `${row.best}s`
  return `${row.best.toLocaleString()} ${row.scoreLabel}`
}

export function formatDuration(ms: number): string {
  if (!ms) return '0m'
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export function GamesPage() {
  const summary = useGamesSummary()

  if (summary.isPending) return <p className="muted">Loading…</p>
  if (summary.isError) {
    return (
      <div>
        <PageHeader title="Retro Games" subtitle="A little arcade — local, private, just for fun" />
        <p className="error">
          Couldn’t load games. They may be turned off in Settings → Features.
        </p>
      </div>
    )
  }

  const bySlug = new Map<string, GameSummaryRow>(summary.data.games.map((g) => [g.slug, g]))
  const t = summary.data.totals

  return (
    <div>
      <PageHeader title="Retro Games" subtitle="A little arcade — local, private, just for fun" />

      <div className="games-records">
        <span className="games-record">
          <Gamepad2 size={15} /> <strong>{t.gamesPlayed}</strong>/{t.gamesTotal} played
        </span>
        <span className="games-record">
          <Clock size={15} /> <strong>{formatDuration(t.totalTimeMs)}</strong> played
        </span>
        <span className="games-record">
          <Flame size={15} /> <strong>{t.dayStreak}</strong> day streak
        </span>
        <span className="games-record">
          <Award size={15} /> <strong>{t.achievementsUnlocked}</strong>/{t.achievementsTotal} achievements
        </span>
      </div>

      <div className="games-grid">
        {GAMES.map((g) => {
          const row = bySlug.get(g.slug)
          return (
            <Link key={g.slug} to={`/games/${g.slug}`} className={`game-card cat-${g.category}`}>
              <span className="game-card-bg" aria-hidden="true">
                {GAME_ICONS[g.slug]}
              </span>
              <span className="game-card-icon" aria-hidden="true">
                {GAME_ICONS[g.slug]}
              </span>
              <span className="game-card-title">{g.title}</span>
              <span className="muted small game-card-blurb">{g.blurb}</span>
              <div className="game-card-stats">
                <span title="Best score">
                  <Trophy size={12} />{' '}
                  {row ? formatBest({ best: row.best, higherIsBetter: g.higherIsBetter, scoreLabel: row.scoreLabel }) : '—'}
                </span>
                <span title="Times played">
                  <Play size={11} /> {row?.plays ?? 0}
                </span>
                {row && row.achievementsUnlocked > 0 && (
                  <span title="Achievements">
                    <Award size={11} /> {row.achievementsUnlocked}/{row.achievementsTotal}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
