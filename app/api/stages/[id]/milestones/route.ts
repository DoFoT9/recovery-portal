import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { addMilestone } from '@/lib/milestones'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id: stageId } = await params
  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const newId = addMilestone(stageId, title.trim())
  return NextResponse.json({ id: newId })
}
