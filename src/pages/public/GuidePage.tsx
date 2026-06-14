import { useEffect, useState } from 'react'

import { GUIDE_SECTIONS } from '../../lib/marketing-content'
import { usePageTitle } from '../../lib/usePageTitle'

export function GuidePage() {
  usePageTitle('Guide — Cortex')
  const [active, setActive] = useState<string>(GUIDE_SECTIONS[0]?.id ?? '')

  // Scroll-spy: highlight the section whose heading sits at the top of the reading
  // area. At the very bottom of the page the last (often short) section can never
  // scroll high enough to win on its own, so bottom-of-page forces it active.
  useEffect(() => {
    const ids = GUIDE_SECTIONS.map((s) => s.id)
    const ACTIVE_LINE = 130 // px below the viewport top
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement
        const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 2
        if (atBottom) {
          setActive(ids[ids.length - 1] ?? '')
          return
        }
        let current = ids[0] ?? ''
        for (const id of ids) {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top <= ACTIVE_LINE) current = id
          else break
        }
        setActive(current)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="guide-layout">
      <nav className="guide-toc" aria-label="Guide contents">
        <span className="guide-toc-label">The guide</span>
        {GUIDE_SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'active' : undefined}>
            {s.title}
          </a>
        ))}
      </nav>

      <div className="guide-body">
        <p className="mkt-eyebrow">Cortex guide</p>
        <h1 className="mkt-section-title" style={{ maxWidth: '28ch' }}>
          Everything Cortex does, and how to use it.
        </h1>
        <p className="mkt-lead" style={{ marginBottom: 'var(--sp-10)' }}>
          A walk through every room of the app, in the order it appears in the sidebar. All of it
          runs locally — there is no hidden cloud step.
        </p>

        {GUIDE_SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="guide-section">
            <h2>{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {s.bullets && (
              <ul>
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
