'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Activity } from 'lucide-react'
import Link from 'next/link'

interface Props {
  portalName: string
  tagline: string
  hasLogo: boolean
  footerClinicName: string | null
}

export default function LoginForm({ portalName, tagline, hasLogo, footerClinicName }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Login failed')
        return
      }
      const data = await res.json()
      if (data.challenge) { router.push('/login/2fa'); return }
      location.href = '/'
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
          <h1 className="text-2xl font-bold">{portalName}</h1>
          {tagline && <p className="text-sm text-neutral-500">{tagline}</p>}
        </div>
        <form onSubmit={submit} className="card space-y-3">
          <div>
            <label className="text-xs text-neutral-500">Email</label>
            <input type="email" className="input mt-1" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 flex items-center justify-between">
              <span>Password</span>
              <Link href="/forgot-password" className="text-[11px] text-brand hover:underline font-normal">
                Forgot password?
              </Link>
            </label>
            <input type="password" className="input mt-1" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-neutral-500 text-center">Need help? Contact your clinician.</p>
        {footerClinicName && (
          <p className="text-[11px] text-neutral-400 text-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
            {footerClinicName}
          </p>
        )}
      </div>
    </div>
  )
}
