import { useCallback, useEffect, useRef, useState } from 'react'

import { Copy, KeyRound, Mic, Pause, Play, RefreshCw, ShieldAlert, Sparkles, Square, Trash2 } from 'lucide-react'

import {
  useAmbientStatus,
  useAmbientTranscripts,
  useForgetAmbient,
  useRegenerateToken,
  useSynthesizeAmbient,
  useToggleListening,
  uploadAmbientSegment,
} from '../api/ambient'
import { Markdown } from '../components/Markdown'
import { EmptyState, PageHeader } from '../components/ui'
import { formatDate } from '../lib/format'
import { startRecording, type Recorder } from '../lib/recorder'

const WEBHOOK_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/ambient/ingest`
const SEGMENT_MS = 30_000 // upload a transcript roughly every 30s of mic capture

/**
 * Continuous browser-mic capture: records fixed segments and hands each finished
 * WAV to `onSegment`. Pressing stop ends the in-flight segment early so its final
 * audio is still captured. Only runs while the tab is open.
 */
function useAmbientMic(onSegment: (wav: Blob, capturedAt: Date) => void) {
  const [active, setActive] = useState(false)
  const activeRef = useRef(false)
  const recRef = useRef<Recorder | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const waitResolveRef = useRef<(() => void) | null>(null)

  const loop = useCallback(async () => {
    while (activeRef.current) {
      let rec: Recorder
      try {
        rec = await startRecording()
      } catch {
        activeRef.current = false
        setActive(false)
        alert('Could not access the microphone.')
        return
      }
      recRef.current = rec
      const startedAt = new Date()
      await new Promise<void>((resolve) => {
        waitResolveRef.current = resolve
        timeoutRef.current = setTimeout(resolve, SEGMENT_MS)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      waitResolveRef.current = null
      try {
        const wav = await rec.stop()
        recRef.current = null
        if (wav.size > 0) onSegment(wav, startedAt)
      } catch {
        recRef.current = null
      }
    }
  }, [onSegment])

  const start = useCallback(() => {
    if (activeRef.current) return
    activeRef.current = true
    setActive(true)
    void loop()
  }, [loop])

  const stop = useCallback(() => {
    activeRef.current = false
    setActive(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    waitResolveRef.current?.() // end the in-flight wait → loop uploads the last segment and exits
  }, [])

  useEffect(
    () => () => {
      activeRef.current = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      recRef.current?.cancel()
    },
    [],
  )

  return { active, start, stop }
}

export function AmbientPage() {
  const status = useAmbientStatus()
  const transcripts = useAmbientTranscripts()
  const toggle = useToggleListening()
  const regen = useRegenerateToken()
  const forget = useForgetAmbient()
  const synth = useSynthesizeAmbient()
  const [revealed, setRevealed] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const listening = status.data?.listening ?? false

  const onSegment = useCallback(
    (wav: Blob, capturedAt: Date) => {
      uploadAmbientSegment(wav, capturedAt)
        .then(() => void transcripts.refetch())
        .catch(() => undefined)
    },
    [transcripts],
  )
  const mic = useAmbientMic(onSegment)

  // Mic only runs while listening is on; flipping the toggle off stops it.
  useEffect(() => {
    if (!listening && mic.active) mic.stop()
  }, [listening, mic])

  const copyToken = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — the value is visible to copy manually */
    }
  }

  if (status.data && !status.data.enabled) {
    return (
      <div>
        <PageHeader title="Ambient" subtitle="Passive listening" />
        <EmptyState message="Ambient listening is disabled." hint="Set AMBIENT_ENABLED=true to enable it." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Ambient" subtitle="Passive listening — folds spoken context into your brain" />

      <section className="card ambient-warn">
        <div className="ambient-warn-head">
          <ShieldAlert size={16} /> Run this only where it's acceptable
        </div>
        <p className="muted small">
          Ambient capture records the people around you and stores the spoken context to your private brain.
          Raw audio is <strong>never kept</strong> — it's transcribed and discarded immediately. Silence is dropped,
          transcripts auto-delete after {status.data?.retentionDays ?? 14} days, and you can erase everything at any
          time. It stays off until you turn it on.
        </p>
      </section>

      {/* Listening toggle + browser mic */}
      <section className="card ambient-control">
        <div className="row-between">
          <div className="ambient-status">
            <span className={`ambient-dot${listening ? ' on' : ''}`} />
            <div>
              <strong>{listening ? 'Listening' : 'Paused'}</strong>
              <span className="muted small block">
                {status.data?.stored ?? 0} transcript{status.data?.stored === 1 ? '' : 's'} stored
                {status.data?.lastIngestAt ? ` · last ${formatDate(status.data.lastIngestAt)}` : ''}
              </span>
            </div>
          </div>
          <button
            className={`btn ${listening ? 'ghost' : 'primary'}`}
            disabled={toggle.isPending}
            onClick={() => toggle.mutate(!listening)}
          >
            {listening ? <Pause size={15} /> : <Play size={15} />} {listening ? 'Pause' : 'Start listening'}
          </button>
        </div>

        <div className="ambient-mic">
          <button
            type="button"
            className={`record-orb${mic.active ? ' recording' : ''}`}
            disabled={!listening}
            onClick={() => (mic.active ? mic.stop() : mic.start())}
            title={listening ? 'Capture from this tab’s microphone' : 'Start listening first'}
          >
            {mic.active ? <Square size={20} /> : <Mic size={20} />}
          </button>
          <p className="muted small">
            {!listening
              ? 'Turn on listening to capture from this tab.'
              : mic.active
                ? 'Capturing from this tab’s mic… transcribes every ~30s. Keep the tab open.'
                : 'Tap to capture from this tab’s mic (or stream from the mobile app via the ingest token).'}
          </p>
        </div>
      </section>

      {/* Ingest token for the external device */}
      <section className="card ambient-token">
        <div className="row-between">
          <h2>
            <KeyRound size={16} /> Device ingest token
          </h2>
          <button className="btn ghost sm" disabled={regen.isPending} onClick={() => regen.mutate(undefined, { onSuccess: (r) => setRevealed(r.token) })}>
            <RefreshCw size={13} /> {status.data?.tokenSet ? 'Regenerate' : 'Generate'}
          </button>
        </div>
        <p className="muted small">
          The mobile app streams audio to the webhook below using this bearer token. It does its own recording;
          Cortex transcribes and keeps only the text.
        </p>
        {revealed ? (
          <div className="ambient-token-reveal">
            <span className="muted small">Copy it now — it won’t be shown again:</span>
            <div className="ambient-token-row">
              <code className="ambient-token-value">{revealed}</code>
              <button className="btn ghost sm" onClick={() => void copyToken(revealed)}>
                <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <p className="muted small">
            {status.data?.tokenSet ? (
              <>Token set (ends ••{status.data.tokenHint}). Regenerate to get a new one.</>
            ) : (
              <>No token yet — generate one to arm the device webhook.</>
            )}
          </p>
        )}
        <div className="ambient-endpoint">
          <span className="muted small">Endpoint (POST audio as <code>audio</code>, or JSON <code>{'{ text }'}</code>):</span>
          <div className="ambient-token-row">
            <code className="ambient-token-value">{WEBHOOK_URL}</code>
            <button className="btn ghost sm" onClick={() => void copyToken(WEBHOOK_URL)}>
              <Copy size={13} /> Copy
            </button>
          </div>
        </div>
      </section>

      {/* On-demand synthesis */}
      <section className="card ambient-synth">
        <div className="row-between">
          <h2>
            <Sparkles size={16} /> Synthesis
          </h2>
          <button className="btn ghost sm" disabled={synth.isPending} onClick={() => synth.mutate(7)}>
            <Sparkles size={13} /> {synth.isPending ? 'Distilling…' : 'Synthesize last 7 days'}
          </button>
        </div>
        {synth.data ? (
          synth.data.empty ? (
            <p className="muted small">No ambient notes in the last 7 days to distill.</p>
          ) : (
            <>
              <Markdown source={synth.data.body} />
              <p className="muted small">Distilled from {synth.data.count} notes.</p>
            </>
          )
        ) : (
          <p className="muted small">A calm digest of recurring themes from your ambient notes.</p>
        )}
      </section>

      {/* Recent transcripts + forget-all */}
      <section className="card ambient-list">
        <div className="row-between">
          <h2>Recent transcripts</h2>
          {(status.data?.stored ?? 0) > 0 && (
            <button
              className="btn danger sm"
              disabled={forget.isPending}
              onClick={() => {
                if (confirm('Forget ALL ambient data? This deletes every transcript and its memory. Cannot be undone.'))
                  forget.mutate()
              }}
            >
              <Trash2 size={13} /> Forget all
            </button>
          )}
        </div>
        {transcripts.isPending && <p className="muted small">Loading…</p>}
        {transcripts.data && transcripts.data.length === 0 && (
          <p className="muted small">Nothing captured yet. Turn on listening, or stream from the mobile app.</p>
        )}
        <div className="ambient-transcripts">
          {transcripts.data?.map((t) => (
            <div key={t.id} className="ambient-transcript">
              <div className="ambient-transcript-meta">
                <span className="mono muted small">{formatDate(t.capturedAt)}</span>
                {t.lang && <span className="badge muted">{t.lang}</span>}
                <span className="badge muted">{t.source}</span>
              </div>
              <p className="ambient-transcript-text">{t.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
