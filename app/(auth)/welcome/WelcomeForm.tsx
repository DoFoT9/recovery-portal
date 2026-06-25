'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Activity, Lock, AlertTriangle } from 'lucide-react'

interface Props { portalName: string; hasLogo: boolean; initialToken: string }

export default function WelcomeForm({ portalName, hasLogo, initialToken }: Props) {
  const [token] = useState(initialToken)
  const [verifying, setVerifying] = useState(true)
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) { setError('No token provided.'); setVerifying(false); return }
    fetch('/api/auth/welcome/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(async res => {
      if (res.ok) {
        const data = await res.json()
        setUser({ email: data.email, name: data.name })
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'Invalid link')
      }
    }).finally(() => setVerifying(false))
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== password2) return toast.error('Passwords do not match')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/welcome/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed')
        return
      }
      toast.success('Password set. Welcome to ' + portalName)
      setTimeout(() => { location.href = '/login' }, 1500)
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/branding/logo" alt={portalName} className="h-16 w-auto max-w-full mx-auto object-contain" />
          ) : (
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand text-white">
              <Activity className="h-7 w-7" />
            </div>
          )}
          <h1 className="text-2xl font-bold">Welcome to {portalName}</h1>
        </div>

        {verifying && <div className="card text-center text-sm text-neutral-500">Checking your link...</div>}

        {!verifying && error && (
          <div className="card border-red-200 dark:border-red-900/50 space-y-3">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Link not valid</span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{error}</p>
            <p className="text-xs text-neutral-500">Welcome links expire after 7 days. Ask your clinician to send you a new one.</p>
          </div>
        )}

        {!verifying && user && (
          <form onSubmit={submit} className="card space-y-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Hi {user.name || user.email}, set a password to finish setting up your account.
            </p>
            <div>
              <label className="text-xs text-neutral-500">New password</label>
              <input type="password" className="input mt-1" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" autoFocus />
              <p className="text-[11px] text-neutral-400 mt-1">Tip: let your password manager generate and save it.</p>
            </div>
            <div>
              <label className="text-xs text-neutral-500">Confirm password</label>
              <input type="password" className="input mt-1" value={password2} onChange={e => setPassword2(e.target.value)} minLength={8} required autoComplete="new-password" />
            </div>
            <button className="btn-primary w-full" disabled={busy}>
              <Lock className="h-4 w-4" />
              {busy ? 'Setting password...' : 'Set password and continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
