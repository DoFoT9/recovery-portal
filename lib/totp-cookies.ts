import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getDb } from './db'

const CHALLENGE_COOKIE = 'rv_2fa_challenge'
const TRUST_COOKIE = 'rv_trusted_device'

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET is required')
  return new TextEncoder().encode(s)
}

export async function setChallengeCookie(userId: string) {
  const token = await new SignJWT({ uid: userId, t: 'challenge' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret())
  ;(await cookies()).set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 60 * 5,
  })
}

export async function readChallengeCookie(): Promise<string | null> {
  const token = (await cookies()).get(CHALLENGE_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    if (payload.t !== 'challenge') return null
    return payload.uid as string
  } catch {
    return null
  }
}

export async function clearChallengeCookie() {
  (await cookies()).delete(CHALLENGE_COOKIE)
}

export async function setTrustedDeviceCookie(userId: string, deviceId: string) {
  const token = await new SignJWT({ uid: userId, did: deviceId, t: 'trust' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret())
  ;(await cookies()).set(TRUST_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function readTrustedDeviceCookie(): Promise<{ uid: string; did: string } | null> {
  const token = (await cookies()).get(TRUST_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    if (payload.t !== 'trust') return null
    return { uid: payload.uid as string, did: payload.did as string }
  } catch {
    return null
  }
}

export async function clearTrustedDeviceCookie() {
  (await cookies()).delete(TRUST_COOKIE)
}

export async function isDeviceTrusted(userId: string): Promise<boolean> {
  const cookie = await readTrustedDeviceCookie()
  if (!cookie || cookie.uid !== userId) return false
  const db = getDb()
  const rows = db.prepare(
    "SELECT id, device_id_hash, expires_at FROM user_trusted_devices WHERE user_id = ? AND datetime(expires_at) > datetime('now')"
  ).all(userId) as { id: string; device_id_hash: string; expires_at: string }[]
  for (const row of rows) {
    if (await bcrypt.compare(cookie.did, row.device_id_hash)) {
      db.prepare("UPDATE user_trusted_devices SET last_used_at = datetime('now') WHERE id = ?").run(row.id)
      return true
    }
  }
  return false
}

export function newDeviceId(): string {
  return crypto.randomBytes(24).toString('base64url')
}

export async function recordTrustedDevice(
  userId: string,
  deviceId: string,
  userAgent: string | null,
): Promise<string> {
  const db = getDb()
  const id = crypto.randomUUID()
  const hash = await bcrypt.hash(deviceId, 10)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  db.prepare(`
    INSERT INTO user_trusted_devices (id, user_id, device_id_hash, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, hash, userAgent, expiresAt)
  return id
}
