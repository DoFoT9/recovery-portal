import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { updateMilestone, deleteMilestone } from '@/lib/milestones'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })
  updateMilestone(id, title.trim())
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  deleteMilestone(id)
  return NextResponse.json({ ok: true })
}
