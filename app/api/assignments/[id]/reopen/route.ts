import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  getDb().prepare(
    "update client_assignments set status='in_progress', completed_at=null where id=?"
  ).run(id)
  return NextResponse.json({ ok: true })
}
