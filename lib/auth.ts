import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'

const COOKIE = 'rv_session'

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET is required')
  return new TextEncoder().encode(s)
}

export async function signSession(user: any) {
  return await new SignJWT({ id: user.id, email: user.email, role: user.role, name: user.full_name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret())
}

export async function setSession(user: any) {
  const token = await signSession(user)
  ;(await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
}

export async function clearSession() {
  (await cookies()).delete(COOKIE)
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    const db = getDb()
    const u = db.prepare(
      "select id,email,full_name,role,theme_preference,last_active_at,last_seen_clients_at,disabled_at,totp_enabled_at from users where id=?"
    ).get(payload.id as string) as any
    if (!u) return null
    if (u.disabled_at) return null

    const now = Date.now()
    const last = u.last_active_at ? new Date(u.last_active_at).getTime() : 0
    if (now - last > 60 * 1000) {
      db.prepare("update users set last_active_at = ? where id = ?")
        .run(new Date().toISOString(), u.id)
      u.last_active_at = new Date().toISOString()
    }
    return u
  } catch {
    return null
  }
}

export async function requireUser() {
  const u = await currentUser()
  if (!u) redirect('/login')
  return u
}

export async function requireAdmin() {
  const u = await requireUser()
  if (u.role !== 'admin') redirect('/dashboard')
  return u
}

export async function verifyPasswordOnly(email: string, password: string) {
  const db = getDb()
  const user = db.prepare("select * from users where lower(email)=lower(?)").get(email) as any
  if (!user) return null
  if (user.disabled_at) return null
  const ok = await bcrypt.compare(password, user.password_hash)
  return ok ? user : null
}

export async function verifyPassword(email: string, password: string) {
  return verifyPasswordOnly(email, password)
}

export async function hashPassword(p: string) {
  return await bcrypt.hash(p, 12)
}

export function setUserTheme(userId: string, theme: string) {
  if (!['light', 'dark', 'system'].includes(theme)) throw new Error('Invalid theme')
  getDb().prepare("update users set theme_preference = ? where id = ?").run(theme, userId)
}
