'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

export function VideoExerciseNotesForm({ video }: { video: any }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const res = await fetch(`/api/videos/${video.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise_notes: (fd.get('exercise_notes') as string) || null,
      }),
    })
    setBusy(false)
    if (res.ok) {
      toast.success('Notes saved')
      router.refresh()
    } else {
      toast.error('Failed to save')
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Exercise notes</h2>
      <p className="text-xs text-neutral-500">
        Free-form clinical description shown to the client alongside the video. Also used in the generated PDF programme (v7.4.4+).
      </p>
      <textarea
        name="exercise_notes"
        defaultValue={video.exercise_notes || ''}
        className="input"
        rows={10}
        placeholder="Lie on your back. Tighten your thigh muscle, pressing the back of your knee into the bed. Keeping your knee locked straight, lift your leg off the bed..."
      />
      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}>
          <Save className="h-4 w-4" />
          {busy ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </form>
  )
}
