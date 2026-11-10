import 'server-only'
import crypto from 'node:crypto'

// Clinician single sign-on (OpenID Connect, e.g. Keycloak). Added in v8.1.0.
// Enabled only when OIDC_ISSUER, OIDC_CLIENT_ID and OIDC_CLIENT_SECRET are all set.
// Optional: OIDC_REQUIRED_ROLE (realm or client role the user must hold),
//           OIDC_PROVIDER_NAME (button label), OIDC_PUBLIC_ORIGIN (e.g. https://rp-demo.example.com),
//           OIDC_ENFORCE_FOR_ADMINS=true (clinicians can no longer use password sign-in).

export const OIDC_COOKIE = 'rv_oidc'

export class OidcError extends Error {
  constructor(public code: string, message?: string) { super(message || code) }
}

export type OidcConfig = { issuer: string; clientId: string; clientSecret: string; requiredRole: string }

export function oidcConfig(): OidcConfig | null {
  const issuer = (process.env.OIDC_ISSUER || '').trim().replace(/\/+$/, '')
  const clientId = (process.env.OIDC_CLIENT_ID || '').trim()
  const clientSecret = (process.env.OIDC_CLIENT_SECRET || '').trim()
  if (!issuer || !clientId || !clientSecret) return null
  return { issuer, clientId, clientSecret, requiredRole: (process.env.OIDC_REQUIRED_ROLE || '').trim() }
}

export function ssoEnforcedForAdmins(): boolean {
  return !!oidcConfig() && process.env.OIDC_ENFORCE_FOR_ADMINS === 'true'
}

export function ssoProviderName(): string {
  return (process.env.OIDC_PROVIDER_NAME || '').trim() || 'Jordan Gall Hosting'
}

export function publicOrigin(req: Request): string {
  const fixed = (process.env.OIDC_PUBLIC_ORIGIN || '').trim().replace(/\/+$/, '')
  if (fixed) return fixed
  const h = req.headers
  const first = (v: string | null) => (v || '').split(',')[0].trim()
  const host = first(h.get('x-forwarded-host')) || first(h.get('host')) || new URL(req.url).host
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) throw new OidcError('error', 'bad host header')
  const proto = first(h.get('x-forwarded-proto')) || (process.env.COOKIE_SECURE === 'true' ? 'https' : new URL(req.url).protocol.replace(':', ''))
  return `${proto === 'http' ? 'http' : 'https'}://${host}`
}

// ---------------------------------------------------------------- helpers
const b64u = (b: Buffer) => b.toString('base64url')
const rand = (n = 32) => b64u(crypto.randomBytes(n))

function stateKey(): Buffer {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET is required')
  return crypto.createHash('sha256').update('rv-oidc-state:' + s).digest()
}

export function sealState(obj: Record<string, unknown>): string {
  const body = b64u(Buffer.from(JSON.stringify(obj)))
  const mac = b64u(crypto.createHmac('sha256', stateKey()).update(body).digest())
  return `${body}.${mac}`
}

export function openState(v: string): any | null {
  const [body, mac] = (v || '').split('.')
  if (!body || !mac) return null
  const want = crypto.createHmac('sha256', stateKey()).update(body).digest()
  const got = Buffer.from(mac, 'base64url')
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null
  try {
    const o = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (typeof o.exp !== 'number' || o.exp < Date.now()) return null
    return o
  } catch { return null }
}

// ---------------------------------------------------------------- discovery + keys (cached)
type Discovery = { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string; end_session_endpoint?: string }
let disc: { at: number; for: string; d: Discovery } | null = null
let jwks: { at: number; uri: string; keys: any[] } | null = null

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(10_000) })
  if (!r.ok) throw new OidcError(init?.method === 'POST' ? 'denied' : 'unavailable', `${url} -> HTTP ${r.status}`)
  return r.json()
}

export async function discovery(cfg: OidcConfig): Promise<Discovery> {
  if (disc && disc.for === cfg.issuer && Date.now() - disc.at < 3600_000) return disc.d
  const d = await getJson(`${cfg.issuer}/.well-known/openid-configuration`)
  if (!d.authorization_endpoint || !d.token_endpoint || !d.jwks_uri || !d.issuer) throw new OidcError('unavailable', 'incomplete discovery document')
  disc = { at: Date.now(), for: cfg.issuer, d }
  return d
}

async function keyFor(uri: string, kid: string | undefined): Promise<any> {
  const pick = () => jwks?.keys.find((k: any) => (kid ? k.kid === kid : true) && k.use !== 'enc')
  if (!jwks || jwks.uri !== uri || Date.now() - jwks.at > 3600_000 || (!pick() && Date.now() - jwks.at > 30_000)) {
    const j = await getJson(uri)
    jwks = { at: Date.now(), uri, keys: Array.isArray(j.keys) ? j.keys : [] }
  }
  const k = pick()
  if (!k) throw new OidcError('error', 'signing key not found')
  return k
}

export async function verifyJwt(token: string, jwksUri: string, expect: { issuer: string; audience?: string; azp?: string; nonce?: string }): Promise<any> {
  const parts = (token || '').split('.')
  if (parts.length !== 3) throw new OidcError('error', 'malformed token')
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  const jwk = await keyFor(jwksUri, header.kid)
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const data = Buffer.from(`${parts[0]}.${parts[1]}`)
  const sig = Buffer.from(parts[2], 'base64url')
  let ok = false
  if (header.alg === 'RS256') ok = crypto.verify('sha256', data, key, sig)
  else if (header.alg === 'PS256') ok = crypto.verify('sha256', data, { key, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, sig)
  else if (header.alg === 'ES256') ok = crypto.verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, sig)
  else throw new OidcError('error', `unsupported alg ${header.alg}`)
  if (!ok) throw new OidcError('error', 'bad token signature')
  const now = Math.floor(Date.now() / 1000)
  if (claims.iss !== expect.issuer) throw new OidcError('error', 'issuer mismatch')
  if (typeof claims.exp !== 'number' || claims.exp < now - 60) throw new OidcError('state', 'token expired')
  if (typeof claims.nbf === 'number' && claims.nbf > now + 60) throw new OidcError('error', 'token not yet valid')
  if (expect.audience) {
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (!aud.includes(expect.audience)) throw new OidcError('error', 'audience mismatch')
  }
  if (expect.azp && claims.azp && claims.azp !== expect.azp) throw new OidcError('error', 'azp mismatch')
  if (expect.nonce !== undefined && claims.nonce !== expect.nonce) throw new OidcError('state', 'nonce mismatch')
  return claims
}

export function hasRole(role: string, clientId: string, ...claimSets: any[]): boolean {
  if (!role) return true
  for (const c of claimSets) {
    if (!c) continue
    if (c.realm_access?.roles?.includes(role)) return true
    if (c.resource_access?.[clientId]?.roles?.includes(role)) return true
    if (Array.isArray(c.roles) && c.roles.includes(role)) return true
    if (Array.isArray(c.groups) && (c.groups.includes(role) || c.groups.includes('/' + role))) return true
  }
  return false
}

// ---------------------------------------------------------------- the two halves of the flow
export async function beginLogin(origin: string): Promise<{ url: string; cookie: string }> {
  const cfg = oidcConfig()
  if (!cfg) throw new OidcError('off')
  const d = await discovery(cfg)
  const state = rand(), nonce = rand(), verifier = rand(48)
  const challenge = b64u(crypto.createHash('sha256').update(verifier).digest())
  const u = new URL(d.authorization_endpoint)
  u.search = new URLSearchParams({
    response_type: 'code', client_id: cfg.clientId, redirect_uri: `${origin}/api/auth/oidc/callback`,
    scope: 'openid email profile', state, nonce, code_challenge: challenge, code_challenge_method: 'S256',
  }).toString()
  return { url: u.toString(), cookie: sealState({ state, nonce, verifier, exp: Date.now() + 10 * 60_000 }) }
}

export async function completeLogin(origin: string, code: string, state: string, cookie: string): Promise<{ email: string; sub: string }> {
  const cfg = oidcConfig()
  if (!cfg) throw new OidcError('off')
  const saved = openState(cookie)
  if (!saved || !state || saved.state !== state) throw new OidcError('state', 'state missing, expired or mismatched')
  if (!code) throw new OidcError('error', 'no authorisation code')
  const d = await discovery(cfg)
  const tok = await getJson(d.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code, redirect_uri: `${origin}/api/auth/oidc/callback`,
      code_verifier: saved.verifier, client_id: cfg.clientId, client_secret: cfg.clientSecret,
    }).toString(),
  })
  const id = await verifyJwt(tok.id_token, d.jwks_uri, { issuer: d.issuer, audience: cfg.clientId, azp: cfg.clientId, nonce: saved.nonce })
  let access: any = null
  if (cfg.requiredRole && typeof tok.access_token === 'string' && tok.access_token.split('.').length === 3) {
    access = await verifyJwt(tok.access_token, d.jwks_uri, { issuer: d.issuer, azp: cfg.clientId })
  }
  if (!hasRole(cfg.requiredRole, cfg.clientId, access, id)) throw new OidcError('role', `missing role ${cfg.requiredRole}`)
  if (!id.email) throw new OidcError('nouser', 'token has no email claim')
  if (id.email_verified !== true) throw new OidcError('unverified', 'email not verified')
  return { email: String(id.email), sub: String(id.sub) }
}
