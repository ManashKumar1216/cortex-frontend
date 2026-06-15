import type { ReactNode } from 'react'

import { useQuery } from '@tanstack/react-query'

import { fetchHealth } from '../lib/api'
import { formatTime, useTimeFormat } from '../lib/time'

function Badge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <span className={`badge ${ok ? 'ok' : 'bad'}`}>{children}</span>
}

export function HealthPanel() {
  const timeFmt = useTimeFormat()
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 5000,
  })

  if (isPending) {
    return <div className="card">Checking connection…</div>
  }

  if (isError) {
    return (
      <div className="card">
        <h2>System status</h2>
        <p>
          backend: <Badge ok={false}>unreachable</Badge>
        </p>
        <p className="muted">{(error as Error).message}</p>
        <p className="muted">Is the backend running on port 4000?</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>System status</h2>
      <ul className="status-list">
        <li>
          <span>backend</span>
          <Badge ok={data.backend === 'ok'}>{data.backend}</Badge>
        </li>
        <li>
          <span>mongodb</span>
          <Badge ok={data.mongodb === 'ok'}>{data.mongodb}</Badge>
        </li>
        <li>
          <span>environment</span>
          <span className="muted">{data.appEnv}</span>
        </li>
      </ul>
      <p className="muted timestamp">last checked {formatTime(data.timestamp, timeFmt)}</p>
    </div>
  )
}
