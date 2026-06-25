'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Send, Server, Globe, Mail, Eye, EyeOff } from 'lucide-react'

type Provider = 'console' | 'smtp'

interface Config {
  provider: Provider
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  has_smtp_password: boolean
  smtp_from_email: string
  email_from_name: string
  email_reply_to: string
  app_base_url: string
  send_welcome: boolean
}

interface Preset { name: string; host: string; port: number; secure: boolean; notes?: string }

const PRESETS: Preset[] = [
  { name: 'Gmail (App Password)', host: 'smtp.gmail.com', port: 587, secure: false, notes: 'Use an App Password from myaccount.google.com/apppasswords (not your regular Google password). Limit: 500/day personal, 2000/day Workspace.' },
  { name: 'Microsoft 365 / Outlook', host: 'smtp.office365.com', port: 587, secure: false, notes: 'Requires SMTP AUTH to be enabled on the mailbox by your tenant admin.' },
  { name: 'Amazon SES (SMTP)', host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false, notes: 'Use SES SMTP credentials (not your AWS account password). Adjust region in the hostname.' },
  { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false, notes: 'User must be the literal string "apikey", password is your API key.' },
  { name: 'Postmark', host: 'smtp.postmarkapp.com', port: 587, secure: false, notes: 'User and password are both your Postmark Server Token.' },
  { name: 'Custom SMTP', host: '', port: 587, secure: false },
]

export default function EmailForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [password, setPassword] = useState<string>('__keep__')
  const [testTo, setTestTo] = useState('')

  useEffect(() => {
    fetch('/api/admin/email').then(r => r.json()).then(c => { setConfig(c); setLoading(false) })
  }, [])

  function applyPreset(p: Preset) {
    if (!config) return
    setConfig({ ...config, smtp_host: p.host, smtp_port: p.port, smtp_secure: p.secure })
    if (p.notes) toast.info(p.notes, { duration: 6000 })
  }

  async function save() {
    if (!config) return
    setSaving(true)
    try {
      const body: any = { ...config }
      body.smtp_password = password
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success('Email config saved')
      setPassword('__keep__')
      router.refresh()
      const fresh = await fetch('/api/admin/email').then(r => r.json())
      setConfig(fresh)
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  async function sendTest() {
    setTesting(true)
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Test failed'); return }
      toast.success(`Test email sent via ${data.provider}!`)
    } catch (e: any) { toast.error(e?.message || 'Test failed') }
    finally { setTesting(false) }
  }

  if (loading || !config) return <div className="card text-sm text-neutral-500">Loading...</div>

  const update = <K extends keyof Config>(k: K, v: Config[K]) => setConfig({ ...config, [k]: v })

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Server className="h-4 w-4 text-brand" /> Provider
        </h2>
        <div className="grid sm:grid-cols-2 gap-2">
          <button type="button" onClick={() => update('provider', 'console')}
            className={`card !shadow-none text-left p-3 transition ${config.provider === 'console' ? '!border-brand' : ''}`}>
            <div className="font-medium text-sm">Console</div>
            <p className="text-xs text-neutral-500 mt-1">Logs emails to stdout. Use for testing - no real emails are sent.</p>
          </button>
          <button type="button" onClick={() => update('provider', 'smtp')}
            className={`card !shadow-none text-left p-3 transition ${config.provider === 'smtp' ? '!border-brand' : ''}`}>
            <div className="font-medium text-sm">SMTP</div>
            <p className="text-xs text-neutral-500 mt-1">Send via any SMTP server: Gmail, Microsoft 365, AWS SES, Mailgun, Postmark, SendGrid, or your own.</p>
          </button>
        </div>
      </section>

      {config.provider === 'smtp' && (
        <section className="card space-y-3">
          <h2 className="font-semibold">SMTP server</h2>
          <div>
            <label className="text-xs text-neutral-500 block mb-2">Quick presets</label>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map(p => (
                <button key={p.name} type="button" onClick={() => applyPreset(p)} className="btn-secondary !py-1.5 text-xs">
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500">Host</label>
              <input className="input mt-1" value={config.smtp_host} onChange={e => update('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Port</label>
              <input type="number" className="input mt-1" value={config.smtp_port} onChange={e => update('smtp_port', parseInt(e.target.value, 10) || 587)} />
              <p className="text-[11px] text-neutral-400 mt-1">587 = STARTTLS (most common). 465 = implicit TLS.</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={config.smtp_secure} onChange={e => update('smtp_secure', e.target.checked)} />
            Use implicit TLS (tick this if your port is 465)
          </label>
          <div>
            <label className="text-xs text-neutral-500">Username</label>
            <input className="input mt-1" value={config.smtp_user} onChange={e => update('smtp_user', e.target.value)} placeholder="you@gmail.com" autoComplete="off" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 flex items-center justify-between">
              Password / API key
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-neutral-400 hover:text-neutral-600">
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input mt-1 font-mono"
              value={password === '__keep__' ? '' : password}
              onChange={e => setPassword(e.target.value)}
              placeholder={config.has_smtp_password ? '(unchanged - type to update)' : 'Enter password or API key'}
              autoComplete="new-password"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Encrypted at rest using TOTP_ENCRYPTION_KEY. Leave blank to keep existing.</p>
          </div>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand" /> Sender identity
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">From email</label>
            <input type="email" className="input mt-1" value={config.smtp_from_email} onChange={e => update('smtp_from_email', e.target.value)} placeholder="noreply@yourclinic.com.au" />
            <p className="text-[11px] text-neutral-400 mt-1">For Gmail this must match your SMTP user. Defaults to SMTP user if blank.</p>
          </div>
          <div>
            <label className="text-xs text-neutral-500">From name</label>
            <input className="input mt-1" value={config.email_from_name} onChange={e => update('email_from_name', e.target.value)} placeholder="Northside Recovery" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-neutral-500">Reply-to (optional)</label>
            <input type="email" className="input mt-1" value={config.email_reply_to} onChange={e => update('email_reply_to', e.target.value)} placeholder="hello@yourclinic.com.au" />
            <p className="text-[11px] text-neutral-400 mt-1">When recipients click Reply, their reply goes here instead of the From address.</p>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-brand" /> Public URL
        </h2>
        <div>
          <label className="text-xs text-neutral-500">Portal base URL</label>
          <input className="input mt-1" value={config.app_base_url} onChange={e => update('app_base_url', e.target.value)} placeholder="https://portal.yourclinic.com.au" />
          <p className="text-[11px] text-neutral-400 mt-1">Used to build links in welcome and reset emails. No trailing slash. Required for welcome emails.</p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Behaviour</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1" checked={config.send_welcome} onChange={e => update('send_welcome', e.target.checked)} />
          <div>
            <p className="font-medium text-sm">Send welcome email when creating clients</p>
            <p className="text-xs text-neutral-500">A "set your password" link is sent to the client&apos;s email so they can finish setting up their account.</p>
          </div>
        </label>
      </section>

      <div className="flex justify-end gap-2 sticky bottom-2 z-10 flex-wrap">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input type="email" className="input" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="Test recipient (defaults to your account)" />
          <button onClick={sendTest} disabled={testing} className="btn-secondary shadow-lg whitespace-nowrap">
            <Send className="h-4 w-4" />
            {testing ? 'Sending...' : 'Send test'}
          </button>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary shadow-lg">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> Save your config first, then send a test. The test verifies the SMTP connection and delivers a styled email to confirm the branding renders correctly.
        </p>
      </div>
    </div>
  )
}
