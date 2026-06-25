import 'server-only'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'

const TOKEN_LIFETIME_DAYS = 7

export async function createWelcomeToken(userId: string): Promise<{ token: string; expiresInDays: number }> {
  const token = crypto.randomBytes(32).toString('base64url')
  const hash = await bcrypt.hash(token, 10)
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000).toISOString()
  getDb().prepare(`
    INSERT INTO email_setup_tokens (id, user_id, token_hash, kind, expires_at)
    VALUES (?, ?, ?, 'welcome', ?)
  `).run(id, userId, hash, expiresAt)
  return { token, expiresInDays: TOKEN_LIFETIME_DAYS }
}

export async function findValidToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT id, user_id, token_hash FROM email_setup_tokens
    WHERE used_at IS NULL AND datetime(expires_at) > datetime('now')
  `).all() as { id: string; user_id: string; token_hash: string }[]
  for (const row of rows) {
    if (await bcrypt.compare(token, row.token_hash)) {
      return { userId: row.user_id, tokenId: row.id }
    }
  }
  return null
}

export function consumeToken(tokenId: string): void {
  getDb().prepare(`UPDATE email_setup_tokens SET used_at = datetime('now') WHERE id = ?`).run(tokenId)
}
