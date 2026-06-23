import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(req: Request) {
  await requireAdmin()
  const { orderedIds } = await req.json() as { orderedIds: string[] }
  if (!Array.isArray(orderedIds)) return NextResponse.json({ error: 'orderedIds required' }, { status: 400 })
  const db = getDb()
  const stmt = db.prepare("update rehab_types set order_index=? where id=?")
  const tx = db.transaction((ids: string[]) => ids.forEach((id, i) => stmt.run(i + 1, id)))
  tx(orderedIds)
  return NextResponse.json({ ok: true })
}
