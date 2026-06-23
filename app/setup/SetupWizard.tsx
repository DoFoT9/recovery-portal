'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ChevronRight, Lock, User as UserIcon, Palette, Sparkles } from 'lucide-react'

type Step = 'welcome' | 'admin' | 'branding' | 'done'

export default function SetupWizard() {
  const [step, setStep] = useState<Step>('welcome')
  const [busy, setBusy] = useState(false)

  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPw, setAdminPw] = useState('')
  const [adminPw2, setAdminPw2] = useState('')

  const [portalName, setPortalName] = useState('Recovery Portal')
  const [clinicName, setClinicName] = useState('')

  async function submitAdmin() {
    if (!adminEmail.includes('@')) return toast.error('Enter a valid email')
    if (adminPw.length < 8) return toast.error('Password must be at least 8 characters')
    if (adminPw !== adminPw2) return toast.error('Passwords do not match')
    setBusy(true)
    try {
      const res = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: adminName, email: adminEmail, password: adminPw }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      setStep('branding')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitBranding() {
    setBusy(true)
    try {
      const res = await fetch('/api/setup/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal_name: portalName,
          footer_clinic_name: clinicName || null,
        }),
      })
      if (!res.ok) throw new Error()
      setStep('done')
    } catch {
      toast.error('Failed to save branding')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand text-white">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">First-run setup</h1>
          <p className="text-sm text-neutral-500">Let&apos;s get your portal ready.</p>
        </div>

        <Stepper step={step} />

        {step === 'welcome' && (
          <section className="card space-y-4">
            <h2 className="font-semibold">Welcome 👋</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              In about 90 seconds we&apos;ll create your admin account and set up basic branding. You can change anything later from the admin Settings menu.
            </p>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-3 text-xs text-blue-800 dark:text-blue-200">
              <strong>Heads up:</strong> this page is one-time-only. Once you create your first admin, this setup wizard is locked and you&apos;ll need to use the regular login.
            </div>
            <button onClick={() => setStep('admin')} className="btn-primary w-full">
              Get started <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        )}

        {step === 'admin' && (
          <section className="card space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-brand" /> Create your admin account
            </h2>
            <div>
              <label className="text-xs text-neutral-500">Your name</label>
              <input className="input mt-1" value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Jane Smith" autoFocus />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Email</label>
              <input type="email" className="input mt-1" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="you@yourclinic.com.au" required />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Password</label>
              <input type="password" className="input mt-1" value={adminPw} onChange={e => setAdminPw(e.target.value)} placeholder="At least 8 characters" minLength={8} required />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Confirm password</label>
              <input type="password" className="input mt-1" value={adminPw2} onChange={e => setAdminPw2(e.target.value)} required />
            </div>
            <button onClick={submitAdmin} disabled={busy} className="btn-primary w-full">
              <Lock className="h-4 w-4" />
              {busy ? 'Creating…' : 'Create admin account'}
            </button>
          </section>
        )}

        {step === 'branding' && (
          <section className="card space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4 text-brand" /> Basic branding
            </h2>
            <p className="text-xs text-neutral-500">You can upload a logo and pick custom colours later from the admin Settings page.</p>
            <div>
              <label className="text-xs text-neutral-500">Portal name</label>
              <input className="input mt-1" value={portalName} onChange={e => setPortalName(e.target.value)} placeholder="Recovery Portal" autoFocus />
              <p className="text-[11px] text-neutral-400 mt-1">Shown in browser titles, login page, and admin header.</p>
            </div>
            <div>
              <label className="text-xs text-neutral-500">Clinic name (optional)</label>
              <input className="input mt-1" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Northside Physiotherapy" />
              <p className="text-[11px] text-neutral-400 mt-1">Shown in the footer. Leave blank to hide.</p>
            </div>
            <button onClick={submitBranding} disabled={busy} className="btn-primary w-full">
              {busy ? 'Saving…' : 'Save and continue'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        )}

        {step === 'done' && (
          <section className="card space-y-4 border-green-300 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <h2 className="font-semibold text-lg">You&apos;re all set!</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Your portal is ready. Log in with your new admin account to get started.
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-3 text-xs text-amber-800 dark:text-amber-200">
              <strong>One more thing:</strong> as an admin, you&apos;ll be prompted to set up two-factor authentication on your first login. It&apos;s required by default for admin accounts (you can change this in Settings → Security).
            </div>
            <a href="/login" className="btn-primary w-full">
              Go to login
              <ChevronRight className="h-4 w-4" />
            </a>
          </section>
        )}
      </div>
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'admin', label: 'Admin' },
    { key: 'branding', label: 'Branding' },
    { key: 'done', label: 'Done' },
  ]
  const idx = steps.findIndex(s => s.key === step)
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, i) => {
        const active = i === idx
        const done = i < idx
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full transition ${done ? 'bg-brand' : active ? 'bg-brand ring-2 ring-brand/30' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
            {i < steps.length - 1 && <div className={`h-px w-6 ${done ? 'bg-brand' : 'bg-neutral-200 dark:bg-neutral-800'}`} />}
          </div>
        )
      })}
    </div>
  )
}
