'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Shield, ShieldCheck, ShieldAlert, Download, RefreshCw, Trash2,
  CheckCircle2, Smartphone, AlertTriangle,
} from 'lucide-react'

interface Props {
  enabled: boolean
  enabledAt: string | null
  required: boolean
  unusedRecoveryCount: number
  userEmail: string
}

interface EnrolData {
  qrDataUrl: string
  secret: string
  issuer: string
  accountName: string
}

interface Device {
  id: string
  user_agent: string | null
  created_at: string
  last_used_at: string | null
  expires_at: string
}

type View = 'overview' | 'confirming' | 'recovery_codes' | 'disabling' | 'regenerate'

export default function TwoFactorSettings({ enabled, enabledAt, required, unusedRecoveryCount, userEmail }: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>('overview')
  const [enrol, setEnrol] = useState<EnrolData | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [disablePw, setDisablePw] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [regenCode, setRegenCode] = useState('')

  useEffect(() => {
    if (enabled) loadDevices()
  }, [enabled])

  async function loadDevices() {
    const res = await fetch('/api/account/2fa/devices')
    if (res.ok) {
      const data = await res.json()
      setDevices(data.devices)
    }
  }

  async function startEnrol() {
    setBusy(true)
    try {
      const res = await fetch('/api/account/2fa/enrol', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      setEnrol(data)
      setView('confirming')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmEnrol() {
    if (!/^\d{6}$/.test(confirmCode.trim())) {
      toast.error('Enter the 6-digit code')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/account/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: confirmCode.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      setRecoveryCodes(data.recoveryCodes)
      setView('recovery_codes')
      toast.success('Two-factor authentication enabled')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function finishEnrol() {
    setRecoveryCodes(null)
    setConfirmCode('')
    setView('overview')
    router.refresh()
  }

  function downloadRecoveryCodes() {
    if (!recoveryCodes) return
    const text = [
      `${enrol?.issuer || 'Recovery Portal'} — recovery codes for ${userEmail}`,
      `Generated ${new Date().toLocaleString()}`,
      '',
      'Keep these somewhere safe (password manager, printed copy in a drawer).',
      'Each code can be used once to log in if you lose access to your authenticator.',
      '',
      ...recoveryCodes,
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recovery-codes-${userEmail}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function doDisable() {
    if (!disablePw || !disableCode) {
      toast.error('Password and code required')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/account/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePw, code: disableCode.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      toast.success('Two-factor authentication disabled')
      setDisablePw(''); setDisableCode('')
      setView('overview')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function regenerate() {
    if (!/^\d{6}$/.test(regenCode.trim())) {
      toast.error('Enter the 6-digit code')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/account/2fa/recovery-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: regenCode.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      setRecoveryCodes(data.recoveryCodes)
      setRegenCode('')
      setView('recovery_codes')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function revokeDevice(id: string) {
    if (!confirm(id === 'all' ? 'Revoke ALL trusted devices?' : 'Revoke this trusted device?')) return
    const res = await fetch('/api/account/2fa/devices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success('Device revoked')
      loadDevices()
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-brand" /> Two-factor authentication
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Add a second step to your login using an authenticator app like Google Authenticator, Authy, or 1Password.
        </p>
      </div>

      {required && !enabled && view === 'overview' && (
        <div className="card border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Your administrator requires 2FA on this account. Please set it up now to continue using the portal.</span>
          </p>
        </div>
      )}

      {view === 'overview' && (
        <>
          <section className="card">
            {enabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-semibold">2FA is enabled</span>
                </div>
                {enabledAt && (
                  <p className="text-xs text-neutral-500">
                    Enabled on {new Date(enabledAt).toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  You&apos;ll be asked for a code from your authenticator app each time you sign in, unless you&apos;re using a trusted device.
                </p>
                {unusedRecoveryCount < 4 && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Only {unusedRecoveryCount} recovery codes left — regenerate soon.
                  </p>
                )}
                <div className="flex gap-2 flex-wrap pt-2">
                  <button onClick={() => setView('regenerate')} className="btn-secondary text-sm">
                    <RefreshCw className="h-4 w-4" /> Regenerate recovery codes
                  </button>
                  <button
                    onClick={() => setView('disabling')}
                    className="btn-secondary text-sm"
                    disabled={required}
                    title={required ? 'Required by administrator' : undefined}
                  >
                    <Shield className="h-4 w-4" /> Disable 2FA
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-neutral-500">
                  <ShieldAlert className="h-5 w-5" />
                  <span className="font-semibold">2FA is not enabled</span>
                </div>
                <button onClick={startEnrol} disabled={busy} className="btn-primary">
                  <Shield className="h-4 w-4" />
                  {busy ? 'Starting…' : 'Set up two-factor authentication'}
                </button>
              </div>
            )}
          </section>

          {enabled && (
            <section className="card space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-brand" /> Trusted devices
              </h2>
              {devices.length === 0 ? (
                <p className="text-sm text-neutral-500">No trusted devices.</p>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {devices.map(d => (
                    <li key={d.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{d.user_agent || 'Unknown device'}</p>
                        <p className="text-xs text-neutral-500">
                          Added {new Date(d.created_at).toLocaleDateString()}
                          {d.last_used_at && ` · last used ${new Date(d.last_used_at).toLocaleDateString()}`}
                          {' · expires '}{new Date(d.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => revokeDevice(d.id)} className="btn-secondary !p-1.5" title="Revoke">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {devices.length > 0 && (
                <button onClick={() => revokeDevice('all')} className="btn-secondary text-xs">
                  Revoke all devices
                </button>
              )}
            </section>
          )}
        </>
      )}

      {view === 'confirming' && enrol && (
        <section className="card space-y-4">
          <h2 className="font-semibold">Step 1: Scan the QR code</h2>
          <p className="text-sm text-neutral-500">
            Open your authenticator app and add a new account by scanning this QR code, or by entering the manual key.
          </p>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrol.qrDataUrl} alt="2FA QR code" className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white p-2" />
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-neutral-500">Can&apos;t scan? Enter manually</summary>
            <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded space-y-1">
              <p><span className="text-neutral-500">Account:</span> <span className="font-mono">{enrol.accountName}</span></p>
              <p><span className="text-neutral-500">Issuer:</span> <span className="font-mono">{enrol.issuer}</span></p>
              <p><span className="text-neutral-500">Secret:</span> <span className="font-mono break-all">{enrol.secret}</span></p>
            </div>
          </details>

          <hr className="border-neutral-200 dark:border-neutral-800" />

          <h2 className="font-semibold">Step 2: Enter the 6-digit code</h2>
          <div>
            <input
              type="text"
              className="input text-center font-mono text-lg tracking-widest"
              value={confirmCode}
              onChange={e => setConfirmCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button onClick={confirmEnrol} disabled={busy || !confirmCode.trim()} className="btn-primary">
              {busy ? 'Verifying…' : 'Verify & enable'}
            </button>
            <button onClick={() => { setView('overview'); setEnrol(null); setConfirmCode('') }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </section>
      )}

      {view === 'recovery_codes' && recoveryCodes && (
        <section className="card space-y-3 border-amber-300 dark:border-amber-900/50">
          <h2 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" /> Save your recovery codes
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>This is the only time these codes will be shown.</strong> Store them in a password manager or print them and keep somewhere safe. Each code works once if you lose access to your authenticator.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-neutral-50 dark:bg-neutral-900 p-3 rounded">
            {recoveryCodes.map((c, i) => (
              <div key={i} className="text-center">{c}</div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={downloadRecoveryCodes} className="btn-secondary">
              <Download className="h-4 w-4" /> Download as .txt
            </button>
            <button onClick={finishEnrol} className="btn-primary">
              <CheckCircle2 className="h-4 w-4" /> I&apos;ve saved them, continue
            </button>
          </div>
        </section>
      )}

      {view === 'disabling' && (
        <section className="card space-y-3 border-red-200 dark:border-red-900/50">
          <h2 className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Disable two-factor authentication
          </h2>
          <p className="text-sm text-neutral-500">
            For your safety we need to verify it&apos;s really you. Enter your password and a current authenticator code.
          </p>
          <div>
            <label className="text-xs text-neutral-500">Current password</label>
            <input type="password" className="input mt-1" value={disablePw} onChange={e => setDisablePw(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Authenticator code</label>
            <input
              type="text"
              className="input mt-1 font-mono text-center"
              value={disableCode}
              onChange={e => setDisableCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={doDisable} disabled={busy} className="btn-danger">
              {busy ? 'Disabling…' : 'Disable 2FA'}
            </button>
            <button onClick={() => { setView('overview'); setDisablePw(''); setDisableCode('') }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </section>
      )}

      {view === 'regenerate' && (
        <section className="card space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-brand" /> Regenerate recovery codes
          </h2>
          <p className="text-sm text-neutral-500">
            Old recovery codes will stop working. Enter a current authenticator code to confirm.
          </p>
          <div>
            <label className="text-xs text-neutral-500">Authenticator code</label>
            <input
              type="text"
              className="input mt-1 font-mono text-center"
              value={regenCode}
              onChange={e => setRegenCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button onClick={regenerate} disabled={busy} className="btn-primary">
              {busy ? 'Generating…' : 'Generate new codes'}
            </button>
            <button onClick={() => { setView('overview'); setRegenCode('') }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
