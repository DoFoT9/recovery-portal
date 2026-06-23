'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Shield, KeyRound } from 'lucide-react'

export default function TwoFactorChallengeForm({
  portalName, hasLogo,
}: { portalName: string; hasLogo: boolean }) {
  const [code, setCode] = useState('')
  const [trust, setTrust] = useState(false)
  const [busy, setBusy] = useState(false)
  const [useRecovery, setUseRecovery] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [useRecovery])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), trust_device: trust }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Verification failed')
        return
      }
      const data = await res.json()
      if (data.usedRecoveryCode) {
        toast.warning('Recovery code used — consider regenerating your codes')
      }
      location.href = '/'
    } finally {
      setBusy(false)
    }
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
              <Shield className="h-7 w-7" />
            </div>
          )}
          <h1 className="text-2xl font-bold">Two-factor verification</h1>
          <p className="text-sm text-neutral-500">
            {useRecovery
              ? 'Enter one of your 16-character recovery codes.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>
        </div>
        <form onSubmit={submit} className="card space-y-3">
          <div>
            <label className="text-xs text-neutral-500">
              {useRecovery ? 'Recovery code' : 'Authentication code'}
            </label>
            <input
              ref={inputRef}
              type="text"
              className="input mt-1 text-center font-mono text-lg tracking-widest"
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={useRecovery ? 'XXXX-XXXX-XXXX-XXXX' : '123456'}
              inputMode={useRecovery ? 'text' : 'numeric'}
              autoComplete="one-time-code"
              maxLength={useRecovery ? 19 : 6}
            />
          </div>
          {!useRecovery && (
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={trust}
                onChange={e => setTrust(e.target.checked)}
                className="rounded"
              />
              Trust this device for 30 days
            </label>
          )}
          <button className="btn-primary w-full" disabled={busy || !code.trim()}>
            {busy ? 'Verifying…' : 'Verify'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => { setUseRecovery(!useRecovery); setCode('') }}
          className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 inline-flex items-center gap-1 mx-auto"
        >
          <KeyRound className="h-3 w-3" />
          {useRecovery ? 'Use authenticator code instead' : 'Use a recovery code'}
        </button>
      </div>
    </div>
  )
}
