import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getBranding } from '@/lib/branding'
import { getEmailConfig } from '@/lib/email/config'
import { sendBrandedEmail } from '@/lib/email/send'
import { createWelcomeToken } from '@/lib/welcome-link'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const user = getDb().prepare("SELECT id, email, full_name, role FROM users WHERE id = ? AND disabled_at IS NULL").get(id) as { id: string; email: string; full_name: string | null; role: string } | undefined
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role !== 'client') return NextResponse.json({ error: 'Can only send welcome to clients' }, { status: 400 })
  const config = getEmailConfig()
  const b = getBranding()
  if (!config.appBaseUrl) return NextResponse.json({ error: 'App base URL not configured. Set it in /admin/settings/email.' }, { status: 400 })
  const { token, expiresInDays } = await createWelcomeToken(user.id)
  const setupUrl = `${config.appBaseUrl.replace(/\/$/, '')}/welcome?token=${encodeURIComponent(token)}`
  const result = await sendBrandedEmail({
    to: user.email, template: 'welcome-client',
    vars: { name: user.full_name || user.email, setupUrl, portalName: b.portal_name },
  })
  if (!result.ok) return NextResponse.json({ error: result.error || 'Failed to send' }, { status: 500 })
  return NextResponse.json({ ok: true, expiresInDays })
}
