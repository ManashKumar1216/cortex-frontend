const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export interface Health {
  backend: string
  mongodb: string
  mongoState: string
  appEnv: string
  timestamp: string
}

export async function fetchHealth(): Promise<Health> {
  const res = await fetch(`${BASE_URL}/api/health`)
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`)
  }
  return (await res.json()) as Health
}
