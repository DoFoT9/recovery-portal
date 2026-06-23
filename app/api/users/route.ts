import { NextResponse } from 'next/server'
import { requireAdmin, hashPassword } from '@/lib/auth'
import { getDb, id } from '@/lib/db'

export async function POST(req: Request) {
  await requireAdmin()
  const b = await req.json()
  if (!b.email || !b.password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }
  const uid = id()
  const hash = await hashPassword(b.password)
  try {
    getDb().prepare(
      "insert into users (id, email, full_name, password_hash, role) values (?, ?, ?, ?, ?)"
    ).run(uid, b.email, b.fullName || '', hash, b.role || 'client')
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
  return NextResponse.json({ id: uid })
}
