import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb, id } from '@/lib/db'

export async function POST(req: Request) {
  await requireAdmin()
  const { rehab_type_id, name, description } = await req.json()
  if (!rehab_type_id || !name) return NextResponse.json({ error: 'rehab_type_id and name required' }, { status: 400 })
  const db = getDb()
  const max = (db.prepare(
    "select coalesce(max(order_index), 0) m from stages where rehab_type_id=?"
  ).get(rehab_type_id) as any).m
  const newId = id()
  db.prepare(
    "insert into stages (id, rehab_type_id, name, description, order_index) values (?, ?, ?, ?, ?)"
  ).run(newId, rehab_type_id, name, description || null, max + 1)

  db.prepare(
    "insert into milestones (id, stage_id, title, order_index, is_default) values (?, ?, 'Mark this stage as done', 1, 1)"
  ).run(id(), newId)

  return NextResponse.json({ id: newId })
}

export async function PATCH(req: Request) {
  await requireAdmin()
  const { id, name, description } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  getDb().prepare("update stages set name=?, description=? where id=?").run(name, description || null, id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  await requireAdmin()
  const { id } = await req.json()
  getDb().prepare("delete from stages where id=?").run(id)
  return NextResponse.json({ ok: true })
}
