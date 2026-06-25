import 'server-only'
import { getBranding, bustBrandingCache } from '@/lib/branding'
import { decryptSecret, encryptSecret } from '@/lib/totp'
import { getDb } from '@/lib/db'
import type { EmailConfig, EmailProviderName } from './types'

export function getEmailConfig(): EmailConfig {
  const b = getBranding()

  // DB first, env var fallback for headless deployments
  let provider = (b.email_provider || process.env.EMAIL_PROVIDER || 'console') as EmailProviderName

  // Decrypt SMTP password (DB) or fall back to env var
  const passwordEnc = b.smtp_password_encrypted || ''
  let password = ''
  if (passwordEnc) {
    try {
      password = decryptSecret(passwordEnc)
    } catch {
      console.warn('[email] Could not decrypt SMTP password (TOTP_ENCRYPTION_KEY changed?). Falling back to console.')
      provider = 'console'
    }
  } else if (process.env.SMTP_PASSWORD) {
    password = process.env.SMTP_PASSWORD
  }

  // If SMTP is selected but core fields are missing, downgrade loudly
  const host = b.smtp_host || process.env.SMTP_HOST || ''
  const user = b.smtp_user || process.env.SMTP_USER || ''
  if (provider === 'smtp' && (!host || !user)) {
    console.warn(`[email] SMTP provider selected but incomplete (host="${host}", user="${user}"). Falling back to console.`)
    provider = 'console'
  }

  const portInt = parseInt(b.smtp_port || process.env.SMTP_PORT || '587', 10)

  return {
    provider,
    fromName: b.email_from_name || b.portal_name || 'Recovery Portal',
    fromEmail: b.smtp_from_email || b.smtp_user || process.env.SMTP_FROM || '',
    replyTo: b.email_reply_to || null,
    smtp: provider === 'smtp' ? {
      host,
      port: portInt,
      secure: b.smtp_secure === '1',
      user,
      password,
    } : null,
    appBaseUrl: b.app_base_url || process.env.APP_BASE_URL || '',
    sendWelcome: b.email_send_welcome !== '0',
  }
}

export function saveEmailConfig(updates: Partial<{
  provider: EmailProviderName
  smtp_host: string
  smtp_port: string
  smtp_secure: '0' | '1'
  smtp_user: string
  smtp_password: string
  smtp_from_email: string
  email_from_name: string
  email_reply_to: string
  app_base_url: string
  email_send_welcome: '0' | '1'
}>) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO branding (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `)
  const map: Record<string, string | null> = {}
  if (updates.provider) map.email_provider = updates.provider
  if (updates.smtp_host !== undefined) map.smtp_host = updates.smtp_host
  if (updates.smtp_port !== undefined) map.smtp_port = updates.smtp_port
  if (updates.smtp_secure !== undefined) map.smtp_secure = updates.smtp_secure
  if (updates.smtp_user !== undefined) map.smtp_user = updates.smtp_user
  if (updates.smtp_from_email !== undefined) map.smtp_from_email = updates.smtp_from_email
  if (updates.email_from_name !== undefined) map.email_from_name = updates.email_from_name
  if (updates.email_reply_to !== undefined) map.email_reply_to = updates.email_reply_to
  if (updates.app_base_url !== undefined) map.app_base_url = updates.app_base_url
  if (updates.email_send_welcome !== undefined) map.email_send_welcome = updates.email_send_welcome
  if (updates.smtp_password !== undefined) {
    if (updates.smtp_password === '') {
      map.smtp_password_encrypted = ''
    } else if (updates.smtp_password !== '__keep__') {
      map.smtp_password_encrypted = encryptSecret(updates.smtp_password)
    }
  }
  const tx = db.transaction((entries: [string, string | null][]) => {
    for (const [k, v] of entries) stmt.run(k, v ?? '')
  })
  tx(Object.entries(map))
  bustBrandingCache()
}
