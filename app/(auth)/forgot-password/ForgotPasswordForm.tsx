'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Mail, KeyRound, ArrowLeft, Activity } from 'lucide-react'
import Link from 'next/link'

interface Props { portalName: string; hasLogo: boolean }

export default function ForgotPasswordForm({ portalName, hasLogo }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [busy, setBusy] = useState(false)

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return toast.error('Enter a valid email')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      toast.success(data.message || 'Check your inbox')
      setStep('code')
    } catch { toast.error('Something went wrong') }
    finally { setBusy(false) }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    if (newPassword !== newPassword2) return toast.error('Passwords do not match')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: newPassword }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed')
        return
      }
      toast.success('Password reset. You can now log in.')
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
          <h1 className="text-2xl font-bold">{step === 'email' ? 'Forgot password' : 'Enter your code'}</h1>
          <p className="text-sm text-neutral-500">
            {step === 'email'
              ? 'Enter your email and we will send you a 6-digit reset code.'
              : `Code sent to ${email}. Check your inbox.`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={requestCode} className="card space-y-3">
            <div>
              <label className="text-xs text-neutral-500">Email</label>
              <input type="email" className="input mt-1" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required autoFocus />
            </div>
            <button className="btn-primary w-full" disabled={busy}>
              <Mail className="h-4 w-4" />
              {busy ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="card space-y-3">
            <div>
              <label className="text-xs text-neutral-500">6-digit code</label>
              <input
                type="text" inputMode="numeric" maxLength={6}
                className="input mt-1 text-center font-mono text-2xl tracking-widest"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required autoFocus placeholder="000000"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">New password</label>
              <input type="password" className="input mt-1" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Confirm new password</label>
              <input type="password" className="input mt-1" value={newPassword2} onChange={e => setNewPassword2(e.target.value)} minLength={8} required autoComplete="new-password" />
            </div>
            <button className="btn-primary w-full" disabled={busy || code.length !== 6}>
              <KeyRound className="h-4 w-4" />
              {busy ? 'Resetting...' : 'Reset password'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setNewPassword(''); setNewPassword2('') }}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 w-full text-center">
              Start over with a different email
            </button>
          </form>
        )}

        <div className="text-center">
          <Link href="/login" className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
