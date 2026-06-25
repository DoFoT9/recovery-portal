import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { findValidToken } from '@/lib/welcome-link'

export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })
  const result = await findValidToken(token)
  if (!result) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })
  const user = getDb().prepare("SELECT id, email, full_name FROM users WHERE id = ? AND disabled_at IS NULL").get(result.userId) as { id: string; email: string; full_name: string | null } | undefined
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ ok: true, email: user.email, name: user.full_name })
}
