import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import {
  decryptSecret, verifyTotp, generateRecoveryCode, hashRecoveryCode,
} from '@/lib/totp'

export async function POST(req: Request) {
  const user = await requireUser()
  const { code } = await req.json()
  if (!code || !/^\d{6}$/.test(String(code).trim())) {
    return NextResponse.json({ error: 'Enter the 6-digit code' }, { status: 400 })
  }

  const db = getDb()
  const row = db.prepare("select totp_pending from users where id = ?").get(user.id) as { totp_pending: string | null }
  if (!row?.totp_pending) {
    return NextResponse.json({ error: 'No enrolment in progress' }, { status: 400 })
  }
  const secret = decryptSecret(row.totp_pending)
  if (!verifyTotp(secret, String(code).trim())) {
    return NextResponse.json({ error: 'Code did not verify — try again' }, { status: 401 })
  }

  const recoveryCodes: string[] = []
  for (let i = 0; i < 10; i++) recoveryCodes.push(generateRecoveryCode())
  const hashed = await Promise.all(recoveryCodes.map(c => hashRecoveryCode(c)))

  const tx = db.transaction(() => {
    db.prepare(`
      update users
         set totp_secret_encrypted = totp_pending,
             totp_enabled_at = datetime('now'),
             totp_pending = NULL
       where id = ?
    `).run(user.id)
    db.prepare("delete from user_recovery_codes where user_id = ?").run(user.id)
    const insert = db.prepare(`
      insert into user_recovery_codes (id, user_id, code_hash) values (?, ?, ?)
    `)
    for (let i = 0; i < recoveryCodes.length; i++) {
      insert.run(crypto.randomUUID(), user.id, hashed[i])
    }
  })
  tx()

  return NextResponse.json({ ok: true, recoveryCodes })
}
