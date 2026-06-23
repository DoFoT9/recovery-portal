import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(req: Request) {
  await requireAdmin()
  const { rehabTypeId, orderedIds } = await req.json() as { rehabTypeId: string, orderedIds: string[] }
  if (!Array.isArray(orderedIds) || !rehabTypeId) {
    return NextResponse.json({ error: 'rehabTypeId and orderedIds required' }, { status: 400 })
  }
  const db = getDb()
  const stmt = db.prepare("update stages set order_index=? where id=? and rehab_type_id=?")
  const tx = db.transaction((ids: string[]) => ids.forEach((id, i) => stmt.run(i + 1, id, rehabTypeId)))
  tx(orderedIds)
  return NextResponse.json({ ok: true })
}
