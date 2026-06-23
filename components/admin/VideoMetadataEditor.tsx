'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'

export function VideoMetadataEditor({
  video, onSaved, onCancel,
}: {
  video: any,
  onSaved: () => void,
  onCancel: () => void,
}) {
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
        title:              fd.get('title'),
        description:        fd.get('description') || null,
        sets:               numberOrNull('sets'),
        reps:               numberOrNull('reps'),
        hold_seconds:       numberOrNull('hold_seconds'),
        target_rom_degrees: numberOrNull('target_rom_degrees'),
        exercise_notes:     (fd.get('exercise_notes') as string) || null,
      }),
    })
    setBusy(false)
    if (res.ok) {
      toast.success('Saved')
      router.refresh()
      onSaved()
    } else {
      toast.error('Failed to save')
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
      <div>
        <label className="text-xs font-medium text-neutral-500">Title</label>
        <input name="title" defaultValue={video.title} className="input mt-1" required />
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-500">Description</label>
        <textarea name="description" defaultValue={video.description ?? ''} className="input mt-1" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumField name="sets"               label="Sets"           defaultValue={video.sets} />
        <NumField name="reps"               label="Reps"           defaultValue={video.reps} />
        <NumField name="hold_seconds"       label="Hold (s)"       defaultValue={video.hold_seconds} />
        <NumField name="target_rom_degrees" label="Target ROM (°)" defaultValue={video.target_rom_degrees} />
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-500">Exercise notes</label>
        <textarea name="exercise_notes" defaultValue={video.exercise_notes ?? ''} className="input mt-1" rows={2}
          placeholder="e.g. Keep knee aligned over toes" />
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>
          <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          <X className="h-4 w-4" /> Cancel
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
        type="number" min="0" step="1"
        defaultValue={defaultValue ?? ''}
        className="input mt-1"
      />
    </div>
  )
}
