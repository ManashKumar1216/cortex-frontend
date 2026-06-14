import { useState } from 'react'

import { Check, RotateCcw, Sparkles, X } from 'lucide-react'

type State = 'idle' | 'editing' | 'approved' | 'cancelled'

const DEFAULT_TITLE = 'Email Dr. Reyes re: results'

/**
 * A faux, client-only re-creation of the in-app approval card — it does nothing
 * but demonstrate the confirm-before-write gate. No network, no real data.
 */
export function ApprovalDemo() {
  const [state, setState] = useState<State>('idle')
  const [title, setTitle] = useState(DEFAULT_TITLE)
  const [draft, setDraft] = useState(DEFAULT_TITLE)

  const reset = () => {
    setState('idle')
    setTitle(DEFAULT_TITLE)
    setDraft(DEFAULT_TITLE)
  }

  return (
    <div className="mkt-approval mkt-rim" aria-label="Example approval card">
      <div className="mkt-approval-tag">
        <Sparkles size={12} /> Cortex wants to write
      </div>

      {state === 'editing' ? (
        <div className="mkt-approval-input">
          <input
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Task title"
            autoFocus
          />
        </div>
      ) : (
        <div className="mkt-approval-title">Create task — “{title}”</div>
      )}

      <div className="mkt-approval-meta">
        <span className="badge warn">Q1 · do now</span>
        <span className="badge muted">due Fri</span>
      </div>
      <div className="mkt-approval-row">Nothing is saved until you approve.</div>

      {state === 'idle' && (
        <div className="mkt-approval-actions">
          <button className="btn primary" onClick={() => setState('approved')}>
            Approve
          </button>
          <button className="btn" onClick={() => { setDraft(title); setState('editing') }}>
            Edit
          </button>
          <button className="btn ghost" onClick={() => setState('cancelled')}>
            Cancel
          </button>
        </div>
      )}

      {state === 'editing' && (
        <div className="mkt-approval-actions">
          <button
            className="btn primary"
            onClick={() => { setTitle(draft.trim() || DEFAULT_TITLE); setState('approved') }}
          >
            Approve with edits
          </button>
          <button className="btn ghost" onClick={() => setState('idle')}>
            Back
          </button>
        </div>
      )}

      {state === 'approved' && (
        <>
          <div className="mkt-approval-result ok">
            <Check size={16} /> Task created — “{title}”
          </div>
          <button className="btn ghost sm mkt-replay" onClick={reset}>
            <RotateCcw size={13} /> Replay
          </button>
        </>
      )}

      {state === 'cancelled' && (
        <>
          <div className="mkt-approval-result cancelled">
            <X size={16} /> Cancelled — nothing was written.
          </div>
          <button className="btn ghost sm mkt-replay" onClick={reset}>
            <RotateCcw size={13} /> Replay
          </button>
        </>
      )}
    </div>
  )
}
