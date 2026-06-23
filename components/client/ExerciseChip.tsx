import { Dumbbell } from 'lucide-react'
import { formatExerciseChip, type ExerciseMetadata } from '@/lib/exercise'

export function ExerciseChip({ metadata }: { metadata: ExerciseMetadata | null | undefined }) {
  const txt = formatExerciseChip(metadata || undefined)
  if (!txt) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-brand/10 text-brand dark:bg-brand/20 px-2 py-0.5 rounded-full">
      <Dumbbell className="h-3 w-3" /> {txt}
    </span>
  )
}
