/**
 * Microphone recorder that yields a 16 kHz mono WAV blob — the format the
 * backend's Whisper step expects. We record via MediaRecorder (webm/opus),
 * then decode + resample in the browser so the server needs no ffmpeg.
 */
export interface Recorder {
  stop: () => Promise<Blob>
  cancel: () => void
}

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mr = new MediaRecorder(stream)
  const chunks: BlobPart[] = []
  mr.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  mr.start()

  const cleanup = () => stream.getTracks().forEach((t) => t.stop())

  return {
    cancel() {
      try {
        mr.stop()
      } catch {
        /* already stopped */
      }
      cleanup()
    },
    stop() {
      return new Promise<Blob>((resolve, reject) => {
        mr.onstop = () => {
          cleanup()
          const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
          blob
            .arrayBuffer()
            .then((buf) => toWav16kMono(buf))
            .then(resolve)
            .catch(reject)
        }
        try {
          mr.stop()
        } catch (err) {
          reject(err as Error)
        }
      })
    },
  }
}

async function toWav16kMono(input: ArrayBuffer): Promise<Blob> {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  const decoded = await ctx.decodeAudioData(input.slice(0))
  await ctx.close()

  const rate = 16000
  const frames = Math.max(1, Math.ceil(decoded.duration * rate))
  const offline = new OfflineAudioContext(1, frames, rate)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return encodeWav(rendered.getChannelData(0), rate)
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buf)
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return new Blob([buf], { type: 'audio/wav' })
}
