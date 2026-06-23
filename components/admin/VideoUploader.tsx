'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dumbbell } from 'lucide-react'

interface Type { id: string, name: string }
interface Stage { id: string, name: string, type_name: string }

export function VideoUploader({
  rehabTypes, stages,
}: { rehabTypes: Type[], stages: Stage[] }) {
  const router = useRouter()
  const [target, setTarget] = useState<'stage' | 'rehab_type'>('stage')
  const [busy, setBusy] = useState(false)
  const [showMeta, setShowMeta] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('target_type', target)
    setBusy(true)
    const res = await fetch('/api/videos', { method: 'POST', body: fd })
    setBusy(false)
    if (res.ok) {
      toast.success('Uploaded')
      router.push('/admin/videos')
      router.refresh()
    } else {
      toast.error((await res.json()).error || 'Upload failed')
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="text-sm font-medium">Attach to</label>
        <div className="flex gap-4 mt-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="target" checked={target === 'stage'} onChange={() => setTarget('stage')} />
            Stage
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="target" checked={target === 'rehab_type'} onChange={() => setTarget('rehab_type')} />
            Rehab Type (intro)
          </label>
        </div>
      </div>

      {target === 'stage' ? (
        <div>
          <label className="text-sm font-medium">Stage</label>
          <select name="target_id" className="input mt-1" required>
            <option value="">Select a stage…</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.type_name} — {s.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium">Rehab Type</label>
          <select name="target_id" className="input mt-1" required>
            <option value="">Select a rehab type…</option>
            {rehabTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      <input name="title" className="input" placeholder="Title" required />
      <textarea name="description" className="input" rows={3} placeholder="Description (optional)" />

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowMeta(s => !s)}
          className="text-sm text-brand hover:underline inline-flex items-center gap-1"
        >
          <Dumbbell className="h-4 w-4" /> {showMeta ? 'Hide' : 'Add'} exercise metadata
        </button>
        {showMeta && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field name="sets"               label="Sets"       type="number" min="0" step="1" />
              <Field name="reps"               label="Reps"       type="number" min="0" step="1" />
              <Field name="hold_seconds"       label="Hold (s)"   type="number" min="0" step="1" />
              <Field name="target_rom_degrees" label="Target ROM (°)" type="number" min="0" step="1" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Exercise notes (optional)</label>
              <textarea name="exercise_notes" className="input mt-1" rows={2}
                placeholder="e.g. Keep knee aligned over toes" />
            </div>
          </div>
        )}
      </div>

      <input name="file" type="file" accept="video/*" className="input" required />
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
    </form>
  )
}

function Field({ name, label, ...rest }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <input name={name} className="input mt-1" {...rest} />
    </div>
  )
}
