import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { api } from '../api/client'

export interface AuthUser {
  id: string
  name: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<{ user: AuthUser }>('/auth/me')
      setUser(r.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // A 401 from any request (expired session) drops us back to the login screen.
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('cortex:unauthorized', onUnauthorized)
    return () => window.removeEventListener('cortex:unauthorized', onUnauthorized)
  }, [])

  const login = async (email: string, password: string) => {
    const r = await api.post<{ user: AuthUser }>('/auth/login', { email, password })
    qc.clear()
    setUser(r.user)
  }
  const signup = async (name: string, email: string, password: string) => {
    const r = await api.post<{ user: AuthUser }>('/auth/signup', { name, email, password })
    qc.clear()
    setUser(r.user)
  }
  const logout = async () => {
    try {
      await api.post('/auth/logout', {})
    } finally {
      qc.clear() // never leak the previous user's cached data
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
