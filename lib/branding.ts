import 'server-only'
import path from 'node:path'
import fs from 'node:fs'
import { getDb } from './db'

export interface Branding {
  portal_name: string
  tagline: string
  brand_color: string
  brand_color_dark: string
  logo_filename: string | null
  favicon_filename: string | null
  footer_clinic_name: string | null
  footer_contact: string | null
  footer_abn: string | null
  footer_support_url: string | null
  email_from_name: string | null
  email_reply_to: string | null
}

export const DEFAULT_BRANDING: Branding = {
  portal_name: 'Recovery Portal',
  tagline: 'Your personal recovery video portal',
  brand_color: '#2563eb',
  brand_color_dark: '#1d4ed8',
  logo_filename: null,
  favicon_filename: null,
  footer_clinic_name: null,
  footer_contact: null,
  footer_abn: null,
  footer_support_url: null,
  email_from_name: null,
  email_reply_to: null,
}

const KEYS = Object.keys(DEFAULT_BRANDING) as (keyof Branding)[]

let cache: { branding: Branding; expiresAt: number } | null = null
const TTL_MS = 30_000

/**
 * Get the current branding configuration.
 * Returns DEFAULT_BRANDING if the DB or branding table does not exist yet
 * (e.g. during Docker image build before any migration runs).
 */
export function getBranding(): Branding {
  if (cache && Date.now() < cache.expiresAt) return cache.branding
  try {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM branding').all() as { key: string; value: string }[]
    const map = new Map(rows.map(r => [r.key, r.value]))
    const branding = { ...DEFAULT_BRANDING }
    for (const k of KEYS) {
      const v = map.get(k)
      if (v !== undefined && v !== null) {
        ;(branding as any)[k] = v
      }
    }
    cache = { branding, expiresAt: Date.now() + TTL_MS }
    return branding
  } catch {
    // DB / branding table not available yet (build time, fresh install, etc).
    // Return defaults without caching so we try again on next call.
    return { ...DEFAULT_BRANDING }
  }
}

export function bustBrandingCache() {
  cache = null
}

export function setBranding(updates: Partial<Branding>) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO branding (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `)
  const tx = db.transaction((entries: [string, any][]) => {
    for (const [k, v] of entries) stmt.run(k, v === null || v === undefined ? null : String(v))
  })
  const filtered: [string, any][] = []
  for (const [k, v] of Object.entries(updates)) {
    if (KEYS.includes(k as keyof Branding)) filtered.push([k, v])
  }
  tx(filtered)
  bustBrandingCache()
}

export function brandingDir(): string {
  const dir = path.resolve(process.cwd(), 'data', 'branding')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function hexToRgbTriplet(hex: string): string {
  const m = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/)
  if (!m) return '37 99 235'
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 0xff} ${(n >> 8) & 0xff} ${n & 0xff}`
}

export function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s)
}

export function isSafeSvg(content: string): boolean {
  const lower = content.toLowerCase()
  const dangerous = [
    '<script',
    'javascript:',
    'onload=',
    'onerror=',
    'onclick=',
    'onmouseover=',
    '<foreignobject',
    '<iframe',
    '<embed',
    '<object',
  ]
  return !dangerous.some(d => lower.includes(d))
}

export function extForMime(mime: string): string | null {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/svg+xml') return 'svg'
  return null
}

export function mimeForFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'svg') return 'image/svg+xml'
  return 'application/octet-stream'
}
