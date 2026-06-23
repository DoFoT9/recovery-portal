import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { setSession } from '@/lib/auth'
import {
  getDecryptedSecretForUser, verifyTotp, verifyRecoveryCode, normaliseRecoveryCode,
} from '@/lib/totp'
import {
  readChallengeCookie, clearChallengeCookie,
  setTrustedDeviceCookie, newDeviceId, recordTrustedDevice,
} from '@/lib/totp-cookies'

export async function POST(req: Request) {
  const userId = await readChallengeCookie()
  if (!userId) {
    return NextResponse.json({ error: 'No active challenge — start over' }, { status: 401 })
  }

  const { code, trust_device } = await req.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code required' }, { status: 400 })
  }

  const db = getDb()
  const user = db.prepare("select * from users where id = ? and disabled_at is null").get(userId) as any
  if (!user) {
    await clearChallengeCookie()
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  const cleaned = code.trim()
  let verified = false
  let usedRecoveryCode = false

  if (/^\d{6}$/.test(cleaned)) {
    const secret = getDecryptedSecretForUser(userId)
    if (secret && verifyTotp(secret, cleaned)) {
      verified = true
    }
  }

  if (!verified) {
    const normalised = normaliseRecoveryCode(cleaned)
    if (normalised.length === 16) {
      const rows = db.prepare(
        "select id, code_hash from user_recovery_codes where user_id = ? and used_at is null"
      ).all(userId) as { id: string; code_hash: string }[]
      for (const row of rows) {
        if (await verifyRecoveryCode(normalised, row.code_hash)) {
          db.prepare("update user_recovery_codes set used_at = datetime('now') where id = ?").run(row.id)
          verified = true
          usedRecoveryCode = true
          break
        }
      }
    }
  }

  if (!verified) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }

  await clearChallengeCookie()
  await setSession(user)

  if (trust_device === true) {
    const did = newDeviceId()
    const ua = req.headers.get('user-agent') || null
    await recordTrustedDevice(userId, did, ua)
    await setTrustedDeviceCookie(userId, did)
  }

  return NextResponse.json({ ok: true, usedRecoveryCode })
}
