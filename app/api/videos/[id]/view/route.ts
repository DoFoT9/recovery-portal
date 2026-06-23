import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { canUserAccessVideo } from '@/lib/access'
import { markVideoViewed } from '@/lib/milestones'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  if (!canUserAccessVideo(user, id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role !== 'admin') {
    markVideoViewed(user.id, id)
  }
  return NextResponse.json({ ok: true })
}
