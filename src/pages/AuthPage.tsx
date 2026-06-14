import { useState, type FormEvent } from 'react'

import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { Field } from '../components/ui'

type Mode = 'login' | 'signup'

export function AuthPage() {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signup') await signup(name.trim(), email.trim(), password)
      else await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card card">
        <Link to="/" className="auth-brand" title="Cortex home">
          <span className="logo">🧠</span> Cortex
        </Link>
        <p className="auth-tagline">Your local, private second brain.</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError(null) }}
            type="button"
          >
            Log in
          </button>
          <button
            className={`auth-tab${mode === 'signup' ? ' active' : ''}`}
            onClick={() => { setMode('signup'); setError(null) }}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form className="form" onSubmit={submit}>
          {mode === 'signup' && (
            <Field label="Name">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
            </Field>
          )}
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus={mode === 'login'}
            />
          </Field>
          <Field label="Password">
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            />
          </Field>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="auth-foot muted">No email verification — accounts and all data stay on this machine.</p>
      </div>
    </div>
  )
}
