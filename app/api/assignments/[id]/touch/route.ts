import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const db = getDb()
  const a = db.prepare("select * from client_assignments where id=?").get(id) as any
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (a.client_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (a.status === 'assigned') {
    const now = new Date().toISOString()
    db.prepare(
      "update client_assignments set status='in_progress', started_at=? where id=?"
    ).run(now, id)
  }
  return NextResponse.json({ ok: true })
}
