import { NextResponse } from 'next/server'
import { getDb, id } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { setupIsOpen } from '@/lib/setup'

export async function POST(req: Request) {
  if (!setupIsOpen()) {
    return NextResponse.json({ error: 'Setup is already complete' }, { status: 403 })
  }
  const { fullName, email, password } = await req.json()
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  if (!password || String(password).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  const hash = await hashPassword(String(password))
  const userId = id()
  try {
    getDb().prepare(
      "INSERT INTO users (id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')"
    ).run(userId, cleanEmail, String(fullName || '').trim() || null, hash)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
