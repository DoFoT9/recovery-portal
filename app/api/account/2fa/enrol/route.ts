import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import {
  generateSecret, buildOtpAuthUrl, encryptSecret, hasTwoFactorEnabled,
} from '@/lib/totp'
import { getBranding } from '@/lib/branding'
import qrcode from 'qrcode'

export async function POST() {
  const user = await requireUser()
  if (hasTwoFactorEnabled(user.id)) {
    return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
  }
  const b = getBranding()
  const secret = generateSecret()
  const issuer = b.portal_name || 'Recovery Portal'
  const otpauth = buildOtpAuthUrl(secret, user.email, issuer)
  const qrDataUrl = await qrcode.toDataURL(otpauth, { width: 240, margin: 1 })

  getDb().prepare("update users set totp_pending = ? where id = ?")
    .run(encryptSecret(secret), user.id)

  return NextResponse.json({
    qrDataUrl,
    secret,
    issuer,
    accountName: user.email,
  })
}
