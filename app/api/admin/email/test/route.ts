import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sendBrandedEmail, verifyEmailConfig } from '@/lib/email/send'

export async function POST(req: Request) {
  const admin = await requireAdmin()
  const { to } = await req.json()
  const target = String(to || '').trim() || admin.email
  if (!target.includes('@')) return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  const verifyResult = await verifyEmailConfig()
  if (!verifyResult.ok) return NextResponse.json({ error: `Connection failed: ${verifyResult.error}`, provider: verifyResult.provider }, { status: 500 })
  const result = await sendBrandedEmail({ to: target, template: 'test', vars: { name: admin.full_name || admin.email } })
  if (!result.ok) return NextResponse.json({ error: result.error || 'Failed to send' }, { status: 500 })
  return NextResponse.json({ ok: true, provider: verifyResult.provider, messageId: result.messageId })
}
