import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { markAdminViewedAssignment } from '@/lib/activity'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  markAdminViewedAssignment(id)
  return NextResponse.json({ ok: true })
}
