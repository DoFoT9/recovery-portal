'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Activity, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

interface Props {
  portalName: string
  tagline: string
  hasLogo: boolean
  footerClinicName: string | null
  sso?: { provider: string; enforced: boolean } | null
  ssoError?: string | null
}

const SSO_ERRORS: Record<string, string> = {
  off: 'Single sign-on is not set up for this portal.',
  unavailable: 'The sign-in service is unavailable right now. Please try again shortly.',
  cancelled: 'Sign-in was cancelled.',
  state: 'Your sign-in took too long or was interrupted. Please try again.',
  denied: 'The sign-in service did not accept the request. Please try again.',
  role: 'Your account does not have access to this portal.',
  nouser: 'No clinician account matches that email address. Ask the portal owner to add you.',
  unverified: 'Your email address has not been verified with the sign-in service yet.',
  error: 'Sign-in failed. Please try again.',
}

export default function LoginForm({ portalName, tagline, hasLogo, footerClinicName, sso, ssoError }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (ssoError) toast.error(SSO_ERRORS[ssoError] || SSO_ERRORS.error)
  }, [ssoError])

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
        {sso && (
          <div className="card space-y-2">
            <a
              href="/api/auth/oidc/start"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <ShieldCheck className="h-4 w-4" />
              Clinician sign-in with {sso.provider}
            </a>
            <p className="text-[11px] text-neutral-500 text-center">
              {sso.enforced ? 'Clinicians must use this button.' : 'For clinicians. Clients, please sign in with your email below.'}
            </p>
          </div>
        )}
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
