'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

export function VideoDetailsForm({ video }: { video: any }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const numberOrNull = (k: string) => {
      const v = fd.get(k)
      if (v === null || v === '') return null
      const n = Number(v)
      return isNaN(n) ? null : n
    }
    setBusy(true)
    const res = await fetch(`/api/videos/${video.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'),
        description: fd.get('description') || null,
        sets: numberOrNull('sets'),
        reps: numberOrNull('reps'),
        hold_seconds: numberOrNull('hold_seconds'),
        target_rom_degrees: numberOrNull('target_rom_degrees'),
      }),
    })
    setBusy(false)
    if (res.ok) {
      toast.success('Details saved')
      router.refresh()
    } else {
      toast.error('Failed to save')
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Details</h2>
      <div>
        <label className="text-xs text-neutral-500">Title</label>
        <input name="title" defaultValue={video.title} className="input mt-1" required />
      </div>
      <div>
        <label className="text-xs text-neutral-500">Description</label>
        <textarea name="description" defaultValue={video.description || ''} className="input mt-1" rows={3} />
      </div>

      <h3 className="text-xs uppercase tracking-wide text-neutral-500 pt-2">
        Exercise prescription defaults
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <NumField name="sets" label="Sets" defaultValue={video.sets} />
        <NumField name="reps" label="Reps" defaultValue={video.reps} />
        <NumField name="hold_seconds" label="Hold (s)" defaultValue={video.hold_seconds} />
        <NumField name="target_rom_degrees" label="Target ROM (°)" defaultValue={video.target_rom_degrees} />
      </div>
      <p className="text-xs text-neutral-500">
        These are the defaults shown to every client. Per-client overrides are set on each assignment.
      </p>

      <div className="flex justify-end pt-2">
        <button className="btn-primary" disabled={busy}>
          <Save className="h-4 w-4" />
          {busy ? 'Saving…' : 'Save details'}
        </button>
      </div>
    </form>
  )
}

function NumField({ name, label, defaultValue }: any) {
  return (
    <div>
      <label className="text-xs text-neutral-500">{label}</label>
      <input
        name={name}
        type="number"
        min="0"
        step="1"
        defaultValue={defaultValue ?? ''}
        className="input mt-1"
      />
    </div>
  )
}
