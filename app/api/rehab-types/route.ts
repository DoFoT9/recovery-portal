import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb, id } from '@/lib/db'

export async function POST(req: Request) {
  await requireAdmin()
  const { name, description, color } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const db = getDb()
  const max = (db.prepare("select coalesce(max(order_index), 0) m from rehab_types").get() as any).m
  const newId = id()
  try {
    db.prepare(
      "insert into rehab_types (id, name, description, color, order_index) values (?, ?, ?, ?, ?)"
    ).run(newId, name, description || null, color || '#6366f1', max + 1)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
  return NextResponse.json({ id: newId })
}

export async function PATCH(req: Request) {
  await requireAdmin()
  const { id, name, description, color } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  getDb().prepare("update rehab_types set name=?, description=?, color=? where id=?")
    .run(name, description || null, color || '#6366f1', id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  await requireAdmin()
  const { id } = await req.json()
  getDb().prepare("delete from rehab_types where id=?").run(id)
  return NextResponse.json({ ok: true })
}
