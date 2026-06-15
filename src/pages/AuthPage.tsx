import { useState, type FormEvent } from 'react'

import { Cpu, Lock, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { BrandMark, Button, Field, Input, PasswordInput, Tabs } from '../components/ui'

type Mode = 'login' | 'signup'

const VALUES = [
  { icon: ShieldCheck, text: 'No telemetry — nothing leaves this machine' },
  { icon: Cpu, text: 'A local LLM thinks with you, grounded in your data' },
  { icon: Lock, text: 'Accounts and data live only on your disk' },
]

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
    <div className="auth-hero">
      <div className="auth-card card">
        <Link to="/" className="auth-brand" title="Cortex home">
          <span className="auth-mark">
            <BrandMark size={34} />
          </span>
        </Link>
        <p className="page-eyebrow" style={{ textAlign: 'center' }}>
          Local · Private · Yours
        </p>
        <h1 className="auth-title">Your second brain.</h1>
        <p className="auth-tagline">A thinking partner that runs entirely on your machine.</p>

        <div className="auth-values">
          {VALUES.map((v) => (
            <span key={v.text} className="auth-value">
              <v.icon size={15} strokeWidth={2} /> {v.text}
            </span>
          ))}
        </div>

        <Tabs
          variant="segmented"
          value={mode}
          onChange={(v) => {
            setMode(v as Mode)
            setError(null)
          }}
          tabs={[
            { value: 'login', label: 'Log in' },
            { value: 'signup', label: 'Sign up' },
          ]}
        />

        <form className="form" onSubmit={submit} style={{ marginTop: 'var(--sp-4)' }}>
          {mode === 'signup' && (
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
            </Field>
          )}
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus={mode === 'login'}
            />
          </Field>
          <Field label="Password">
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            />
          </Field>
          {error && <p className="error">{error}</p>}
          <Button type="submit" variant="primary" full loading={busy} className="auth-submit">
            {mode === 'signup' ? 'Create account' : 'Log in'}
          </Button>
        </form>

        <p className="auth-foot muted">No email verification — accounts and all data stay on this machine.</p>
      </div>
    </div>
  )
}
