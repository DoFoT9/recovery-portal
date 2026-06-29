'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { VideoTranscriptSection } from './VideoTranscriptSection'

export function VideoExerciseNotesForm({ video }: { video: any }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState<string>(video.exercise_notes || '')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    const res = await fetch(`/api/videos/${video.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise_notes: notes.trim() || null,
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

  function useTranscriptAsNotes(transcript: string) {
    if (notes.trim() && !confirm('Replace your current exercise notes with the transcript? Your existing text will be lost.')) return
    setNotes(transcript)
    toast.success('Transcript copied below \u2014 review and click Save')
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Exercise notes</h2>

      <VideoTranscriptSection
        videoId={video.id}
        initialStatus={video.transcript_status || 'none'}
        initialText={video.transcript_text || null}
        initialError={video.transcript_error || null}
        onUseAsDescription={useTranscriptAsNotes}
      />

      <p className="text-xs text-neutral-500">
        Free-form clinical description shown to the client alongside the video. Also used in the generated PDF programme.
      </p>
      <textarea
        name="exercise_notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="input"
        rows={10}
        placeholder="Lie on your back. Tighten your thigh muscle, pressing the back of your knee into the bed. Keeping your knee locked straight, lift your leg off the bed..."
      />
      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}>
          <Save className="h-4 w-4" />
          {busy ? 'Saving\u2026' : 'Save notes'}
        </button>
      </div>
    </form>
  )
}
