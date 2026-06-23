'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, ShieldCheck, Users } from 'lucide-react'

interface Props {
  initial: { require_2fa_admin: boolean; require_2fa_client: boolean }
}

export default function SecurityForm({ initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Security settings saved')
      router.refresh()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand" /> Two-factor authentication
        </h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.require_2fa_admin}
            onChange={e => setForm(f => ({ ...f, require_2fa_admin: e.target.checked }))}
          />
          <div>
            <p className="font-medium text-sm">Require 2FA for administrators</p>
            <p className="text-xs text-neutral-500">
              Strongly recommended. Admin accounts have full access to all clients.
            </p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.require_2fa_client}
            onChange={e => setForm(f => ({ ...f, require_2fa_client: e.target.checked }))}
          />
          <div>
            <p className="font-medium text-sm flex items-center gap-1">
              <Users className="h-3 w-3" /> Require 2FA for clients
            </p>
            <p className="text-xs text-neutral-500">
              Higher security but adds a step at login. Many clinics keep this off for older clients.
            </p>
          </div>
        </label>
      </section>
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
