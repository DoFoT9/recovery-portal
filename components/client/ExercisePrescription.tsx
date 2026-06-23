import { Dumbbell, Repeat, Timer, Activity, NotebookPen } from 'lucide-react'
import type { ExerciseMetadata } from '@/lib/exercise'

export function ExercisePrescription({ metadata }: { metadata: ExerciseMetadata | null | undefined }) {
  if (!metadata) return null
  const { sets, reps, hold_seconds, target_rom_degrees, exercise_notes } = metadata
  const hasAny = sets != null || reps != null || hold_seconds != null
    || target_rom_degrees != null || (exercise_notes && exercise_notes.trim() !== '')
  if (!hasAny) return null

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-brand" /> Prescription
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {sets != null && (<Field icon={Repeat} label="Sets" value={String(sets)} />)}
        {reps != null && (<Field icon={Repeat} label="Reps" value={String(reps)} />)}
        {hold_seconds != null && (<Field icon={Timer} label="Hold" value={`${hold_seconds}s`} />)}
        {target_rom_degrees != null && (<Field icon={Activity} label="Target ROM" value={`${target_rom_degrees}°`} />)}
      </div>
      {exercise_notes && exercise_notes.trim() !== '' && (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-neutral-500 mb-1">
            <NotebookPen className="h-3 w-3" /> Notes
          </div>
          <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{exercise_notes}</p>
        </div>
      )}
    </div>
  )
}

function Field({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-2.5">
      <div className="flex items-center gap-1 text-xs text-neutral-500">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  )
}
