import 'server-only'
import { getDb } from '@/lib/db'
import { resolveExerciseMetadata } from '@/lib/exercise'
import type { ProgrammeContext, ProgrammeExercise } from './templates/programme'

/**
 * Pulls everything we need for the PDF from the DB and resolves the
 * per-assignment exercise overrides over the per-video defaults.
 *
 * Returns null if the assignment doesn't exist.
 */
export function buildProgrammeContext(assignmentId: string): ProgrammeContext | null {
  const db = getDb()

  const assignment = db.prepare(`
    select ca.*,
           rt.name as type_name,
           s.name  as stage_name,
           u.full_name as client_name,
           u.email     as client_email
    from client_assignments ca
    join rehab_types rt on rt.id = ca.rehab_type_id
    left join stages s  on s.id  = ca.stage_id
    join users u        on u.id  = ca.client_id
    where ca.id = ?
  `).get(assignmentId) as any

  if (!assignment) return null

  let videos: any[]
  if (assignment.stage_id) {
    videos = db.prepare(`
      select * from videos
      where stage_id = ? and status = 'ready'
      order by created_at
    `).all(assignment.stage_id) as any[]
  } else {
    // Whole-programme: intro videos + all stage videos in stage order.
    const intros = db.prepare(`
      select * from videos
      where rehab_type_id = ? and stage_id is null and status = 'ready'
      order by created_at
    `).all(assignment.rehab_type_id) as any[]

    const stageVideos = db.prepare(`
      select v.* from videos v
      join stages s on s.id = v.stage_id
      where s.rehab_type_id = ? and v.status = 'ready'
      order by s.order_index, v.created_at
    `).all(assignment.rehab_type_id) as any[]

    videos = [...intros, ...stageVideos]
  }

  const exercises: ProgrammeExercise[] = videos.map((v, i) => {
    const m = resolveExerciseMetadata(v, assignment)
    return {
      index: i + 1,
      title: v.title,
      description: v.exercise_notes ?? v.description ?? null,
      sets: m.sets,
      reps: m.reps,
      hold_seconds: m.hold_seconds,
      target_rom_degrees: m.target_rom_degrees,
    }
  })

  const programmeTitle = assignment.stage_id
    ? `${assignment.type_name} \u2014 ${assignment.stage_name}`
    : assignment.type_name

  return {
    programmeTitle,
    clientName: assignment.client_name || assignment.client_email || null,
    exercises,
  }
}
