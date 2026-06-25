import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getEmailConfig, saveEmailConfig } from '@/lib/email/config'

export async function GET() {
  await requireAdmin()
  const c = getEmailConfig()
  return NextResponse.json({
    provider: c.provider, smtp_host: c.smtp?.host || '', smtp_port: c.smtp?.port || 587,
    smtp_secure: c.smtp?.secure || false, smtp_user: c.smtp?.user || '',
    has_smtp_password: !!(c.smtp?.password),
    smtp_from_email: c.fromEmail, email_from_name: c.fromName,
    email_reply_to: c.replyTo || '', app_base_url: c.appBaseUrl, send_welcome: c.sendWelcome,
  })
}

export async function POST(req: Request) {
  await requireAdmin()
  const body = await req.json()
  const updates: any = {}
  if (body.provider) updates.provider = body.provider
  if (body.smtp_host !== undefined) updates.smtp_host = String(body.smtp_host).trim()
  if (body.smtp_port !== undefined) updates.smtp_port = String(body.smtp_port).trim()
  if (body.smtp_secure !== undefined) updates.smtp_secure = body.smtp_secure ? '1' : '0'
  if (body.smtp_user !== undefined) updates.smtp_user = String(body.smtp_user).trim()
  if (body.smtp_password !== undefined && body.smtp_password !== '__keep__') updates.smtp_password = String(body.smtp_password)
  if (body.smtp_from_email !== undefined) updates.smtp_from_email = String(body.smtp_from_email).trim()
  if (body.email_from_name !== undefined) updates.email_from_name = String(body.email_from_name).trim()
  if (body.email_reply_to !== undefined) updates.email_reply_to = String(body.email_reply_to).trim()
  if (body.app_base_url !== undefined) updates.app_base_url = String(body.app_base_url).trim().replace(/\/$/, '')
  if (body.send_welcome !== undefined) updates.email_send_welcome = body.send_welcome ? '1' : '0'
  saveEmailConfig(updates)
  return NextResponse.json({ ok: true })
}
