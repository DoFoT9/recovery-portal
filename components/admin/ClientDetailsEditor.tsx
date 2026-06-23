'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, Save, X, KeyRound, Ban, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'

export function ClientDetailsEditor({ client }: { client: any }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dangerBusy, setDangerBusy] = useState<string | null>(null)
  const isDisabled = !!client.disabled_at
  const displayName = client.full_name || client.email

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget as HTMLFormElement)
    const body: any = {
      fullName: (fd.get('fullName') as string) || null,
      email: (fd.get('email') as string),
    }
    const password = (fd.get('password') as string) || ''
    if (password.trim()) body.password = password.trim()
    setBusy(true)
    const res = await fetch(`/api/users/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setBusy(false)
    if (res.ok) {
      toast.success(password.trim() ? 'Saved · password updated' : 'Saved')
      setEditing(false)
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to save')
    }
  }

  async function toggleDisabled() {
    const verb = isDisabled ? 'enable' : 'disable'
    if (!confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${displayName}?${isDisabled ? '' : ' They will be unable to log in until re-enabled.'}`)) return
    setDangerBusy('toggle')
    try {
      const res = await fetch(`/api/users/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: !isDisabled }),
      })
      if (!res.ok) throw new Error()
      toast.success(isDisabled ? 'Client enabled' : 'Client disabled')
      router.refresh()
    } catch {
      toast.error('Failed — try again')
    } finally {
      setDangerBusy(null)
    }
  }

  async function deleteClient() {
    if (!confirm(`Permanently delete ${displayName}?\n\nThis removes ALL their assignments, comments, milestone progress, and video views. This CANNOT be undone.`)) return
    if (!confirm(`Final check — really delete ${displayName}?`)) return
    setDangerBusy('delete')
    try {
      const res = await fetch(`/api/users/${client.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Client deleted')
      router.push('/admin/clients')
    } catch {
      toast.error('Failed — try again')
      setDangerBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        {editing ? (
          <form onSubmit={submit} className="space-y-3">
            <h3 className="font-semibold">Edit client details</h3>
            <div>
              <label className="text-xs text-neutral-500">Full name</label>
              <input name="fullName" defaultValue={client.full_name || ''} className="input mt-1" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Email</label>
              <input name="email" type="email" defaultValue={client.email} className="input mt-1" required />
            </div>
            <div>
              <label className="text-xs text-neutral-500 inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Reset password (optional)
              </label>
              <input name="password" type="text" placeholder="Leave blank to keep existing" className="input mt-1" />
              <p className="text-[11px] text-neutral-400 mt-1">
                Set a new password to reset the client&apos;s login. They will need to be told the new value.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <h3 className="font-semibold">Account details</h3>
            <p className="text-sm text-neutral-500">
              Update name, email, or reset the client&apos;s password.
            </p>
            <button onClick={() => setEditing(true)} className="btn-secondary">
              <Pencil className="h-4 w-4" /> Edit details
            </button>
          </>
        )}
      </div>

      <div className="card border-red-200 dark:border-red-900/50 space-y-3">
        <h3 className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Danger zone
        </h3>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {isDisabled ? 'Re-enable login' : 'Disable login'}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isDisabled
                ? `Client was disabled on ${new Date(client.disabled_at).toLocaleString()}. Re-enabling restores their access without touching any data.`
                : 'Prevents the client from logging in. All their data (assignments, comments, progress) is preserved and can be restored later.'}
            </p>
          </div>
          <button
            onClick={toggleDisabled}
            disabled={dangerBusy !== null}
            className={isDisabled ? 'btn-primary' : 'btn-secondary'}
          >
            {isDisabled
              ? <><RotateCcw className="h-4 w-4" /> Enable</>
              : <><Ban className="h-4 w-4" /> Disable</>
            }
          </button>
        </div>

        <hr className="border-neutral-200 dark:border-neutral-800" />

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Delete permanently</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Removes the client AND all their assignments, comments, milestone progress, and video views. <strong>This cannot be undone.</strong>
            </p>
          </div>
          <button
            onClick={deleteClient}
            disabled={dangerBusy !== null}
            className="btn-danger"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}
