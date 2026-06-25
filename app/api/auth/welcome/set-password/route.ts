import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { findValidToken, consumeToken } from '@/lib/welcome-link'

export async function POST(req: Request) {
  const { token, new_password } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })
  if (!new_password || String(new_password).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  const result = await findValidToken(token)
  if (!result) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })
  const hash = await hashPassword(String(new_password))
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, result.userId)
  consumeToken(result.tokenId)
  return NextResponse.json({ ok: true })
}
