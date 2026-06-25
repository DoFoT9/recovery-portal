import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { verifyAndConsumeResetCode } from '@/lib/password-reset'

export async function POST(req: Request) {
  const { email, code, new_password } = await req.json()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanCode = String(code || '').replace(/\s/g, '')
  if (!cleanEmail.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  if (!/^\d{6}$/.test(cleanCode)) return NextResponse.json({ error: 'Code must be 6 digits' }, { status: 400 })
  if (!new_password || String(new_password).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  const user = getDb().prepare("SELECT id FROM users WHERE lower(email) = ? AND disabled_at IS NULL").get(cleanEmail) as { id: string } | undefined
  if (!user) return NextResponse.json({ error: 'Invalid code or email' }, { status: 401 })
  const ok = await verifyAndConsumeResetCode(user.id, cleanCode)
  if (!ok) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
  const newHash = await hashPassword(String(new_password))
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, user.id)
  return NextResponse.json({ ok: true })
}
