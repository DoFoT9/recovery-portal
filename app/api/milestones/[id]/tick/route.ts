import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { tickMilestone, untickMilestone } from '@/lib/milestones'

function canClientAccessMilestone(userId: string, milestoneId: string) {
  const db = getDb()
  const row = db.prepare(`
    select 1
    from milestones m
    join stages s on s.id = m.stage_id
    where m.id = ?
      and exists (
        select 1 from client_assignments ca
        where ca.client_id = ?
          and (ca.stage_id = s.id or (ca.stage_id is null and ca.rehab_type_id = s.rehab_type_id))
      )
    limit 1
  `).get(milestoneId, userId)
  return !!row
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id: milestoneId } = await params
  if (user.role !== 'admin' && !canClientAccessMilestone(user.id, milestoneId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  tickMilestone(user.id, milestoneId, 'manual')
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id: milestoneId } = await params
  if (user.role !== 'admin' && !canClientAccessMilestone(user.id, milestoneId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  untickMilestone(user.id, milestoneId)
  return NextResponse.json({ ok: true })
}
