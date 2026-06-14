import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// All frontend env files live in ./env (one per environment, e.g. .env.local).
export default defineConfig(({ mode }) => {
  const envDir = path.resolve(import.meta.dirname, 'env')
  const env = loadEnv(mode, envDir, 'VITE_')

  return {
    plugins: [react()],
    envDir,
    server: {
      port: Number(env.VITE_PORT) || 5173,
    },
  }
})
