import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { OIDC_COOKIE, OidcError, completeLogin, publicOrigin } from '@/lib/oidc'

export const dynamic = 'force-dynamic'

// Clinicians only: the SSO identity must match an existing, enabled admin account by email.
// The identity provider enforces its own 2FA, so the portal's TOTP step is not repeated here.
export async function GET(req: Request) {
  let origin: string
  try { origin = publicOrigin(req) } catch { return new NextResponse('Bad request', { status: 400 }) }
  const jar = await cookies()
  const back = (code: string) => { jar.delete(OIDC_COOKIE); return NextResponse.redirect(new URL(`/login?sso=${code}`, origin)) }
  const q = new URL(req.url).searchParams
  if (q.get('error')) return back('cancelled')
  try {
    const who = await completeLogin(origin, q.get('code') || '', q.get('state') || '', jar.get(OIDC_COOKIE)?.value || '')
    const user = getDb().prepare("select * from users where lower(email)=lower(?) and role='admin'").get(who.email) as any
    if (!user || user.disabled_at) {
      console.warn(`[oidc] sign-in refused: no enabled clinician account for ${who.email}`)
      return back('nouser')
    }
    jar.delete(OIDC_COOKIE)
    await setSession(user)
    console.log(`[oidc] clinician signed in: ${user.email}`)
    return NextResponse.redirect(new URL('/', origin))
  } catch (e: any) {
    const code = e instanceof OidcError ? e.code : 'error'
    console.warn(`[oidc] callback failed (${code}):`, e?.message || e)
    return back(code)
  }
}
