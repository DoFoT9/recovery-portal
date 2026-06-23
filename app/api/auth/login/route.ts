import { NextResponse } from 'next/server'
import { setSession, verifyPasswordOnly } from '@/lib/auth'
import { hasTwoFactorEnabled } from '@/lib/totp'
import { setChallengeCookie, isDeviceTrusted } from '@/lib/totp-cookies'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const user = await verifyPasswordOnly(email, password)
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (hasTwoFactorEnabled(user.id)) {
    if (await isDeviceTrusted(user.id)) {
      await setSession(user)
      return NextResponse.json({ ok: true })
    }
    await setChallengeCookie(user.id)
    return NextResponse.json({ challenge: true })
  }

  await setSession(user)
  return NextResponse.json({ ok: true })
}
