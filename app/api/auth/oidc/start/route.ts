import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { OIDC_COOKIE, OidcError, beginLogin, oidcConfig, publicOrigin } from '@/lib/oidc'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  let origin: string
  try { origin = publicOrigin(req) } catch { return new NextResponse('Bad request', { status: 400 }) }
  if (!oidcConfig()) return NextResponse.redirect(new URL('/login?sso=off', origin))
  try {
    const { url, cookie } = await beginLogin(origin)
    ;(await cookies()).set(OIDC_COOKIE, cookie, {
      httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: 600,
    })
    return NextResponse.redirect(url)
  } catch (e: any) {
    console.error('[oidc] start failed:', e?.message || e)
    const code = e instanceof OidcError ? e.code : 'unavailable'
    return NextResponse.redirect(new URL(`/login?sso=${code}`, origin))
  }
}
