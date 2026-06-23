import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const user = await requireUser()
  const rows = getDb().prepare(`
    select id, user_agent, created_at, last_used_at, expires_at
      from user_trusted_devices
     where user_id = ? and datetime(expires_at) > datetime('now')
     order by datetime(coalesce(last_used_at, created_at)) desc
  `).all(user.id)
  return NextResponse.json({ devices: rows })
}

export async function DELETE(req: Request) {
  const user = await requireUser()
  const { id } = await req.json()
  if (id === 'all') {
    getDb().prepare("delete from user_trusted_devices where user_id = ?").run(user.id)
  } else {
    getDb().prepare("delete from user_trusted_devices where id = ? and user_id = ?").run(id, user.id)
  }
  return NextResponse.json({ ok: true })
}
