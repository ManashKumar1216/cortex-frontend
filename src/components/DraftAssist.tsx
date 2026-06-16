import { useState } from 'react'
import { PenLine } from 'lucide-react'

import { useDraftText, useLLMHealth } from '../api/chat'

/**
 * A small "draft from your notes" assist for any writing surface. Takes the current
 * field text as the topic, generates a piece grounded ONLY in the owner's notes (with
 * the same engine as chat Draft mode), and hands the result back via `onInsert` so the
 * caller decides how to place it (append vs replace). Renders nothing when Draft mode
 * is disabled, so it's safe to drop next to any textarea.
 */
export function DraftAssist({
  value,
  onInsert,
  disabled,
  label = 'Draft from notes',
}: {
  value: string
  onInsert: (text: string) => void
  disabled?: boolean
  label?: string
}) {
  const health = useLLMHealth()
  const draft = useDraftText()
  const [hint, setHint] = useState<string | null>(null)

  if (!health.data?.draftEnabled) return null
  const seed = value.trim()
  const tooShort = seed.length < 8

  const run = () => {
    if (tooShort || draft.isPending) return
    setHint(null)
    draft.mutate(seed, {
      onSuccess: (r) => {
        onInsert(r.text)
        const n = r.sources.length
        setHint(n ? `drafted from ${n} note${n > 1 ? 's' : ''}` : 'no related notes found')
      },
      onError: () => setHint('draft failed'),
    })
  }

  return (
    <div className="draft-assist">
      <button
        type="button"
        className="btn ghost sm"
        onClick={run}
        disabled={disabled || tooShort || draft.isPending}
        title={
          tooShort
            ? 'Type a topic or a few words first, then draft from your notes'
            : 'Expand this into a draft grounded in your own notes'
        }
      >
        <PenLine size={13} className={draft.isPending ? 'spin' : undefined} />{' '}
        {draft.isPending ? 'Drafting…' : label}
      </button>
      {hint && <span className="muted small draft-assist-hint">{hint}</span>}
    </div>
  )
}
