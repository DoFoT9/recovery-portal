import 'server-only'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'

const CODE_LIFETIME_MIN = 15
const RATE_LIMIT_WINDOW_MIN = 15
const RATE_LIMIT_MAX = 5

export function generateResetCode(): string {
  const buf = crypto.randomBytes(4)
  const n = buf.readUInt32BE(0) % 1_000_000
  return n.toString().padStart(6, '0')
}

export async function createResetCode(
  userId: string,
  requesterIp: string | null,
): Promise<{ code: string; expiresInMinutes: number } | { error: string }> {
  const db = getDb()
  const recent = db.prepare(`
    SELECT COUNT(*) AS c FROM password_reset_codes
    WHERE user_id = ? AND datetime(created_at) > datetime('now', ?)
  `).get(userId, `-${RATE_LIMIT_WINDOW_MIN} minutes`) as { c: number }
  if (recent.c >= RATE_LIMIT_MAX) {
    return { error: 'Too many reset requests. Please wait a few minutes and try again.' }
  }
  const code = generateResetCode()
  const hash = await bcrypt.hash(code, 10)
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + CODE_LIFETIME_MIN * 60_000).toISOString()
  db.prepare(`
    INSERT INTO password_reset_codes (id, user_id, code_hash, expires_at, requester_ip)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, hash, expiresAt, requesterIp)
  return { code, expiresInMinutes: CODE_LIFETIME_MIN }
}

export async function verifyAndConsumeResetCode(userId: string, code: string): Promise<boolean> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT id, code_hash FROM password_reset_codes
    WHERE user_id = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')
    ORDER BY created_at DESC LIMIT 5
  `).all(userId) as { id: string; code_hash: string }[]
  for (const row of rows) {
    if (await bcrypt.compare(code.trim(), row.code_hash)) {
      db.prepare(`UPDATE password_reset_codes SET used_at = datetime('now') WHERE id = ?`).run(row.id)
      return true
    }
  }
  return false
}
