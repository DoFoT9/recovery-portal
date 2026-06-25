import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createResetCode } from '@/lib/password-reset'
import { sendBrandedEmail } from '@/lib/email/send'
import { log } from '@/lib/log'

export async function POST(req: Request) {
  const { email } = await req.json()
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail.includes('@')) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
  }
  const user = getDb().prepare(
    "SELECT id, email, full_name FROM users WHERE lower(email) = ? AND disabled_at IS NULL"
  ).get(cleanEmail) as { id: string; email: string; full_name: string | null } | undefined
  if (user) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
    const result = await createResetCode(user.id, ip)
    if ('code' in result) {
      const sendResult = await sendBrandedEmail({
        to: user.email, template: 'password-reset',
        vars: { name: user.full_name || user.email, code: result.code, expiresInMinutes: result.expiresInMinutes },
      })
      if (!sendResult.ok) log.error('password-reset.email-failed', { error: sendResult.error, userId: user.id })
    } else { log.warn('password-reset.rate-limited', { userId: user.id }) }
  }
  return NextResponse.json({ ok: true, message: 'If an account exists with that email, you will receive a reset code shortly.' })
}
