export interface ExerciseMetadata {
  sets: number | null
  reps: number | null
  hold_seconds: number | null
  target_rom_degrees: number | null
  exercise_notes: string | null
}

export function resolveExerciseMetadata(video: any, assignment: any): ExerciseMetadata {
  return {
    sets:               assignment?.override_sets         ?? video?.sets         ?? null,
    reps:               assignment?.override_reps         ?? video?.reps         ?? null,
    hold_seconds:       assignment?.override_hold_seconds ?? video?.hold_seconds ?? null,
    target_rom_degrees: assignment?.override_rom_degrees  ?? video?.target_rom_degrees ?? null,
    exercise_notes:     video?.exercise_notes ?? null,
  }
}

export function hasAnyExerciseMetadata(m: ExerciseMetadata | null | undefined): boolean {
  if (!m) return false
  return m.sets != null || m.reps != null || m.hold_seconds != null
      || m.target_rom_degrees != null || (m.exercise_notes != null && m.exercise_notes.trim() !== '')
}

export function formatExerciseChip(m: ExerciseMetadata | null | undefined): string | null {
  if (!m) return null
  const parts: string[] = []
  if (m.sets != null && m.reps != null) parts.push(`${m.sets}x${m.reps}`)
  else if (m.reps != null) parts.push(`x${m.reps}`)
  else if (m.sets != null) parts.push(`${m.sets} sets`)
  if (m.hold_seconds != null) parts.push(`${m.hold_seconds}s hold`)
  if (m.target_rom_degrees != null) parts.push(`${m.target_rom_degrees}°`)
  return parts.length ? parts.join(' · ') : null
}
