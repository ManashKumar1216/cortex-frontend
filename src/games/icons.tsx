import type { ReactElement } from 'react'

/**
 * Hand-drawn, single-colour game logos (fill = currentColor) so each can render
 * twice: a crisp accent-coloured mark on the card, and a big faint watermark in
 * the card background for a gamified feel. Cutout details use the app bg colour.
 */

const BG = '#0c0d10'

/** Build pixel-art rects from a string grid ('#' = filled). */
function pixels(grid: string[], cell: number, ox: number, oy: number): ReactElement[] {
  const out: ReactElement[] = []
  grid.forEach((row, r) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') {
        out.push(
          <rect key={`${r}-${x}`} x={ox + x * cell} y={oy + r * cell} width={cell} height={cell} rx={0.4} />,
        )
      }
    }
  })
  return out
}

const INVADER = [
  '..#.....#..',
  '...#...#...',
  '..#######..',
  '.##.###.##.',
  '###########',
  '#.#######.#',
  '#.#.....#.#',
  '...##.##...',
]

function svg(children: ReactElement | ReactElement[]): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  )
}

export const GAME_ICONS: Record<string, ReactElement> = {
  snake: svg([
    <rect key="a" x="2.5" y="13.5" width="5" height="5" rx="1.6" />,
    <rect key="b" x="7" y="13.5" width="5" height="5" rx="1.6" />,
    <rect key="c" x="7" y="9" width="5" height="5" rx="1.6" />,
    <rect key="d" x="11.5" y="9" width="5" height="5" rx="1.6" />,
    <rect key="e" x="11.5" y="4.5" width="5" height="5" rx="1.6" />,
    <rect key="f" x="16" y="4.5" width="5.5" height="5.5" rx="2.2" />,
    <circle key="eye" cx="19.6" cy="6.6" r="0.95" fill={BG} />,
  ]),
  tetris: svg([
    <rect key="a" x="3" y="6.5" width="5.4" height="5.4" rx="1" />,
    <rect key="b" x="9.3" y="6.5" width="5.4" height="5.4" rx="1" />,
    <rect key="c" x="15.6" y="6.5" width="5.4" height="5.4" rx="1" />,
    <rect key="d" x="9.3" y="12.8" width="5.4" height="5.4" rx="1" />,
  ]),
  minesweeper: svg([
    <circle key="c" cx="12" cy="13" r="6" />,
    <rect key="t" x="11.1" y="2.6" width="1.8" height="4.4" rx="0.9" />,
    <rect key="b" x="11.1" y="18.6" width="1.8" height="3.2" rx="0.9" />,
    <rect key="l" x="2.6" y="12.1" width="3.4" height="1.8" rx="0.9" />,
    <rect key="r" x="18" y="12.1" width="3.4" height="1.8" rx="0.9" />,
    <rect key="d1" x="5.4" y="6.4" width="3" height="1.7" rx="0.8" transform="rotate(45 6.9 7.2)" />,
    <rect key="d2" x="15.6" y="6.4" width="3" height="1.7" rx="0.8" transform="rotate(-45 17.1 7.2)" />,
    <circle key="hl" cx="9.6" cy="10.6" r="1.3" fill={BG} />,
  ]),
  asteroids: svg([
    <path key="ship" d="M12 3.5 L16.5 17 L12 13.6 L7.5 17 Z" />,
    <circle key="r1" cx="4.6" cy="6" r="2.2" />,
    <circle key="r2" cx="19.4" cy="8.2" r="2.8" />,
    <circle key="r3" cx="18.4" cy="18.4" r="1.8" />,
  ]),
  'space-invaders': svg(pixels(INVADER, 1.9, 1.55, 4.4)),
  flappy: svg([
    <circle key="body" cx="10.5" cy="12.5" r="6.2" />,
    <path key="beak" d="M16 11.4 L21.5 13 L16 14.6 Z" />,
    <circle key="eye" cx="8.6" cy="10.4" r="1.4" fill={BG} />,
    <path key="wing" d="M7 13 q3.2 3.6 7 1.2" fill="none" stroke={BG} strokeWidth="1.4" strokeLinecap="round" />,
  ]),
  runner: svg([
    <circle key="head" cx="14" cy="5" r="2.3" />,
    <path
      key="body"
      d="M14.4 7.4 L11.5 12.5 L7.5 14.5 M11.9 11 L16.5 12 M13.2 9 L17 7.4 M11.5 12.5 L13.5 18 M11.5 12.5 L8 17.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
    <path key="m1" d="M3 7 H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
    <path key="m2" d="M2.5 11 H5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  ]),
  'hill-climb': svg([
    <path
      key="hill"
      d="M1.5 17 q5.5 -9 11 -4 q4 2.8 10 1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />,
    <rect key="body" x="6.5" y="11.5" width="11" height="4" rx="1.8" />,
    <rect key="cab" x="9" y="8.6" width="5" height="3.4" rx="1.2" />,
    <circle key="w1" cx="9.4" cy="16.4" r="2.1" />,
    <circle key="w2" cx="15" cy="16.4" r="2.1" />,
    <circle key="w1i" cx="9.4" cy="16.4" r="0.8" fill={BG} />,
    <circle key="w2i" cx="15" cy="16.4" r="0.8" fill={BG} />,
  ]),
  pacman: svg([
    <path key="pac" d="M12 12 L20.5 8 A8.5 8.5 0 1 1 20.5 16 Z" />,
    <circle key="eye" cx="11" cy="7" r="1.1" fill={BG} />,
    <circle key="d1" cx="4" cy="12" r="1.5" />,
    <circle key="d2" cx="8.5" cy="12" r="1.2" />,
  ]),
  frogger: svg([
    <rect key="body" x="5.5" y="9" width="13" height="9.5" rx="4.5" />,
    <circle key="e1" cx="8.5" cy="7" r="2.6" />,
    <circle key="e2" cx="15.5" cy="7" r="2.6" />,
    <circle key="p1" cx="8.5" cy="7" r="1" fill={BG} />,
    <circle key="p2" cx="15.5" cy="7" r="1" fill={BG} />,
    <rect key="l1" x="2.5" y="15.5" width="4" height="2.4" rx="1.2" />,
    <rect key="l2" x="17.5" y="15.5" width="4" height="2.4" rx="1.2" />,
  ]),
  'doodle-jump': svg([
    <rect key="p1" x="2.5" y="17" width="8.5" height="2.6" rx="1.3" />,
    <rect key="p2" x="13" y="12" width="8.5" height="2.6" rx="1.3" />,
    <rect key="p3" x="6" y="6.8" width="8.5" height="2.6" rx="1.3" />,
    <path key="arrow" d="M12 2.2 L15.4 6.4 H13.3 V10 H10.7 V6.4 H8.6 Z" />,
  ]),
  sudoku: svg([
    <rect key="frame" x="3" y="3" width="18" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />,
    <path key="grid" d="M9 3.5 V20.5 M15 3.5 V20.5 M3.5 9 H20.5 M3.5 15 H20.5" stroke="currentColor" strokeWidth="1.2" />,
    <rect key="c1" x="4.6" y="4.6" width="2.8" height="2.8" rx="0.6" />,
    <rect key="c2" x="16.6" y="10.6" width="2.8" height="2.8" rx="0.6" />,
    <rect key="c3" x="10.6" y="16.6" width="2.8" height="2.8" rx="0.6" />,
    <rect key="c4" x="10.6" y="4.6" width="2.8" height="2.8" rx="0.6" opacity="0.55" />,
  ]),
}
