import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import {
  getDecryptedSecretForUser, verifyTotp, generateRecoveryCode, hashRecoveryCode, hasTwoFactorEnabled,
} from '@/lib/totp'

export async function POST(req: Request) {
  const user = await requireUser()
  if (!hasTwoFactorEnabled(user.id)) {
    return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
  }
  const { code } = await req.json()
  const secret = getDecryptedSecretForUser(user.id)
  if (!secret || !verifyTotp(secret, String(code || '').trim())) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }
  const recoveryCodes: string[] = []
  for (let i = 0; i < 10; i++) recoveryCodes.push(generateRecoveryCode())
  const hashed = await Promise.all(recoveryCodes.map(c => hashRecoveryCode(c)))
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare("delete from user_recovery_codes where user_id = ?").run(user.id)
    const insert = db.prepare("insert into user_recovery_codes (id, user_id, code_hash) values (?, ?, ?)")
    for (let i = 0; i < recoveryCodes.length; i++) {
      insert.run(crypto.randomUUID(), user.id, hashed[i])
    }
  })
  tx()
  return NextResponse.json({ recoveryCodes })
}
