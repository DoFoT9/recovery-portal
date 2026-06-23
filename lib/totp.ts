import 'server-only'
import crypto from 'node:crypto'
import { authenticator } from 'otplib'
import bcrypt from 'bcryptjs'
import { getDb } from './db'
import { getBranding } from './branding'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY
  if (!hex) throw new Error('TOTP_ENCRYPTION_KEY is required')
  if (hex.length !== 64) throw new Error('TOTP_ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
  return Buffer.from(hex, 'hex')
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

export function decryptSecret(blob: string): string {
  const buf = Buffer.from(blob, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export function generateSecret(): string {
  return authenticator.generateSecret()
}

export function buildOtpAuthUrl(secret: string, accountName: string, issuer: string): string {
  return authenticator.keyuri(accountName, issuer, secret)
}

export function verifyTotp(secret: string, token: string): boolean {
  try {
    authenticator.options = { window: 1 }
    return authenticator.verify({ token: token.replace(/\s+/g, ''), secret })
  } catch {
    return false
  }
}

const RECOVERY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRecoveryCode(): string {
  const bytes = crypto.randomBytes(16)
  let out = ''
  for (let i = 0; i < 16; i++) {
    out += RECOVERY_CHARS[bytes[i] % RECOVERY_CHARS.length]
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`
}

export function normaliseRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase()
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(normaliseRecoveryCode(code), 10)
}

export async function verifyRecoveryCode(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normaliseRecoveryCode(plain), hash)
}

export function isTwoFactorRequired(user: { role: string }): boolean {
  const b = getBranding() as any
  if (user.role === 'admin') return b.require_2fa_admin !== '0'
  if (user.role === 'client') return b.require_2fa_client === '1'
  return false
}

export function hasTwoFactorEnabled(userId: string): boolean {
  const db = getDb()
  const row = db.prepare(
    "SELECT totp_enabled_at FROM users WHERE id = ?"
  ).get(userId) as { totp_enabled_at: string | null } | undefined
  return !!(row?.totp_enabled_at)
}

export function getDecryptedSecretForUser(userId: string): string | null {
  const db = getDb()
  const row = db.prepare(
    "SELECT totp_secret_encrypted FROM users WHERE id = ?"
  ).get(userId) as { totp_secret_encrypted: string | null } | undefined
  if (!row?.totp_secret_encrypted) return null
  try {
    return decryptSecret(row.totp_secret_encrypted)
  } catch {
    return null
  }
}

export function countUnusedRecoveryCodes(userId: string): number {
  const db = getDb()
  const row = db.prepare(
    "SELECT COUNT(*) AS c FROM user_recovery_codes WHERE user_id = ? AND used_at IS NULL"
  ).get(userId) as { c: number }
  return row.c
}
