import { useEffect, useState } from 'react'

import { GUIDE_SECTIONS } from '../../lib/marketing-content'
import { usePageTitle } from '../../lib/usePageTitle'

export function GuidePage() {
  usePageTitle('Guide — Cortex')
  const [active, setActive] = useState<string>(GUIDE_SECTIONS[0]?.id ?? '')

  // Scroll-spy: highlight the section that currently owns the reading area. The
  // probe line sits ~a third down the viewport (not at the very top) so the
  // active section matches what's prominently in view rather than lagging on the
  // previous section whose tail is still near the top. At the very bottom the
  // last (often short) section can never reach the line, so we force it active.
  useEffect(() => {
    const ids = GUIDE_SECTIONS.map((s) => s.id)
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
        const line = window.innerHeight * 0.33 // reading line, ~a third down
        let current = ids[0] ?? ''
        for (const id of ids) {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top <= line) current = id
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
