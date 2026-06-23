import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getDecryptedSecretForUser, verifyTotp, isTwoFactorRequired } from '@/lib/totp'

export async function POST(req: Request) {
  const user = await requireUser()
  if (isTwoFactorRequired(user)) {
    return NextResponse.json(
      { error: 'Your administrator requires 2FA — it cannot be disabled.' },
      { status: 403 },
    )
  }
  const { password, code } = await req.json()
  if (!password || !code) {
    return NextResponse.json({ error: 'Password and code required' }, { status: 400 })
  }
  const db = getDb()
  const row = db.prepare("select password_hash from users where id = ?").get(user.id) as { password_hash: string }
  if (!await bcrypt.compare(String(password), row.password_hash)) {
    return NextResponse.json({ error: 'Password incorrect' }, { status: 401 })
  }
  const secret = getDecryptedSecretForUser(user.id)
  if (!secret || !verifyTotp(secret, String(code).trim())) {
    return NextResponse.json({ error: 'Code incorrect' }, { status: 401 })
  }
  db.prepare(`
    update users
       set totp_secret_encrypted = NULL,
           totp_enabled_at = NULL,
           totp_pending = NULL
     where id = ?
  `).run(user.id)
  db.prepare("delete from user_recovery_codes where user_id = ?").run(user.id)
  db.prepare("delete from user_trusted_devices where user_id = ?").run(user.id)
  return NextResponse.json({ ok: true })
}
