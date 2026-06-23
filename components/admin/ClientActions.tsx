'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Ban, RotateCcw, Trash2, Loader2 } from 'lucide-react'

export function ClientActions({ client }: { client: any }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const isDisabled = !!client.disabled_at
  const displayName = client.full_name || client.email

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const verb = isDisabled ? 'Enable' : 'Disable'
    if (!confirm(`${verb} ${displayName}?${isDisabled ? '' : ' They will be unable to log in until re-enabled.'}`)) return
    setBusy('toggle')
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
      setBusy(null)
    }
  }

  async function del(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Permanently delete ${displayName}?\n\nThis removes ALL their assignments, comments, milestone progress, and video views. This CANNOT be undone.`)) return
    if (!confirm(`Final check — really delete ${displayName}?`)) return
    setBusy('delete')
    try {
      const res = await fetch(`/api/users/${client.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Client deleted')
      router.refresh()
    } catch {
      toast.error('Failed — try again')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex gap-1 flex-shrink-0">
      <button
        onClick={toggle}
        disabled={busy !== null}
        className="btn-secondary !p-1.5"
        title={isDisabled ? 'Re-enable login' : 'Disable login'}
        aria-label={isDisabled ? 'Re-enable client' : 'Disable client'}
      >
        {busy === 'toggle'
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : isDisabled
            ? <RotateCcw className="h-4 w-4 text-green-600" />
            : <Ban className="h-4 w-4 text-amber-600" />
        }
      </button>
      <button
        onClick={del}
        disabled={busy !== null}
        className="btn-danger !p-1.5"
        title="Delete permanently"
        aria-label="Delete client"
      >
        {busy === 'delete'
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Trash2 className="h-4 w-4" />
        }
      </button>
    </div>
  )
}
