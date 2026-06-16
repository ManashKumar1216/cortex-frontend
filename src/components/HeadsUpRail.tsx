import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react'

import { useRelatedMemories } from '../api/memory'
import { sourceRoute } from '../lib/sourceRoute'

/**
 * "You also noted…" — Heads-Up resurfacing rail. Given the text the owner is
 * currently typing (chat draft / new-note content), it debounces, fetches
 * older-but-relevant memories, and shows them as deep-linking chips. Renders
 * nothing until there's something worth surfacing.
 */
export function HeadsUpRail({
  text,
  excludeType,
  excludeId,
}: {
  text: string
  excludeType?: string
  excludeId?: string
}) {
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 600)
    return () => clearTimeout(t)
  }, [text])

  const related = useRelatedMemories(debounced, excludeType, excludeId)
  const [open, setOpen] = useState(true)
  const items = related.data ?? []
  if (!items.length) return null

  return (
    <div className="heads-up-rail">
      <button type="button" className="heads-up-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Lightbulb size={13} /> You also noted ({items.length})
      </button>
      {open && (
        <div className="heads-up-items">
          {items.map((it) => (
            <Link
              key={`${it.sourceType}:${it.sourceId}`}
              className="heads-up-item"
              to={sourceRoute(it.sourceType)}
              title={it.snippet}
            >
              <span className="heads-up-item-title">{it.title || it.sourceType}</span>
              <span className="heads-up-item-snippet">{it.snippet}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
