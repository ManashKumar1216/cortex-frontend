import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import { CornerDownLeft, Inbox, MessageSquare, Plus, Search, type LucideIcon } from 'lucide-react'

import { NAV_ITEMS } from '../lib/nav'

interface Command {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  run: (nav: ReturnType<typeof useNavigate>) => void
}

/** ⌘K / Ctrl-K command palette: jump to any surface or fire a quick action. */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    const onOpen = () => setOpen(true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('cortex:open-cmdk', onOpen)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('cortex:open-cmdk', onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const commands = useMemo<Command[]>(() => {
    const goto: Command[] = NAV_ITEMS.map((item) => ({
      id: `goto:${item.to}`,
      label: item.label,
      hint: 'Go to',
      icon: item.icon,
      run: (nav) => nav(item.to),
    }))
    const actions: Command[] = [
      { id: 'new:capture', label: 'New capture', hint: 'Action', icon: Inbox, run: (nav) => nav('/capture') },
      { id: 'new:task', label: 'New task', hint: 'Action', icon: Plus, run: (nav) => nav('/tasks') },
      { id: 'new:chat', label: 'New chat', hint: 'Action', icon: MessageSquare, run: (nav) => nav('/chat') },
    ]
    return [...actions, ...goto]
  }, [])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(term))
  }, [q, commands])

  useEffect(() => {
    if (active >= results.length) setActive(0)
  }, [results.length, active])

  if (!open) return null

  const run = (c: Command | undefined) => {
    if (!c) return
    setOpen(false)
    c.run(navigate)
  }

  return createPortal(
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <Search size={16} />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Search surfaces and actions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                run(results[active])
              }
            }}
          />
          <kbd className="cmdk-kbd">esc</kbd>
        </div>
        <div className="cmdk-list">
          {results.length === 0 && <div className="cmdk-empty">No matches</div>}
          {results.map((c, i) => (
            <button
              key={c.id}
              className={`cmdk-item${i === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(c)}
            >
              <c.icon size={16} strokeWidth={2} />
              <span className="cmdk-item-label">{c.label}</span>
              {c.hint && <span className="cmdk-item-hint">{c.hint}</span>}
              {i === active && <CornerDownLeft size={13} className="cmdk-enter" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
