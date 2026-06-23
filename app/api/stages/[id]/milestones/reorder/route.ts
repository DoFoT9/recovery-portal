import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { reorderMilestones } from '@/lib/milestones'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id: stageId } = await params
  const { orderedIds } = await req.json() as { orderedIds: string[] }
  if (!Array.isArray(orderedIds)) return NextResponse.json({ error: 'orderedIds required' }, { status: 400 })
  reorderMilestones(stageId, orderedIds)
  return NextResponse.json({ ok: true })
}
