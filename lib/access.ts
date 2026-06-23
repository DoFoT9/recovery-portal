import { getDb } from '@/lib/db'

export function canUserAccessVideo(user: any, videoId: string) {
  if (user.role === 'admin') return true
  const db = getDb()
  const row = db.prepare(`
    select 1 from videos v
    where v.id = ?
      and v.status = 'ready'
      and (
        (v.stage_id is null and exists (
          select 1 from client_assignments ca
          where ca.client_id = ? and ca.rehab_type_id = v.rehab_type_id
        ))
        or
        (v.stage_id is not null and exists (
          select 1 from client_assignments ca
          where ca.client_id = ? and ca.stage_id = v.stage_id
        ))
        or
        (v.stage_id is not null and exists (
          select 1 from client_assignments ca
          join stages s on s.id = v.stage_id
          where ca.client_id = ? and ca.stage_id is null and ca.rehab_type_id = s.rehab_type_id
        ))
      )
    limit 1
  `).get(videoId, user.id, user.id, user.id)
  return !!row
}
