import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb, id } from '@/lib/db'
import { clearProgressForAssignmentScope } from '@/lib/milestones'

export async function POST(req: Request) {
  const user = await requireAdmin()
  const b = await req.json()
  if (!b.clientId || !b.rehabTypeId) {
    return NextResponse.json({ error: 'clientId and rehabTypeId required' }, { status: 400 })
  }

  const cleared = clearProgressForAssignmentScope(b.clientId, b.rehabTypeId, b.stageId || null)

  const aid = id()
  getDb().prepare(`
    insert into client_assignments
      (id, client_id, rehab_type_id, stage_id, admin_recommendations, assigned_by)
    values (?, ?, ?, ?, ?, ?)
  `).run(aid, b.clientId, b.rehabTypeId, b.stageId || null, b.adminRecommendations || null, user.id)

  return NextResponse.json({
    id: aid,
    clearedMilestones: cleared.clearedMilestones,
    clearedVideos: cleared.clearedVideos,
  })
}

export async function DELETE(req: Request) {
  await requireAdmin()
  const { id } = await req.json()
  getDb().prepare("delete from client_assignments where id=?").run(id)
  return NextResponse.json({ ok: true })
}
