import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getBranding, setBranding, isValidHex, type Branding } from '@/lib/branding'

const TEXT_FIELDS: (keyof Branding)[] = [
  'portal_name',
  'tagline',
  'footer_clinic_name',
  'footer_contact',
  'footer_abn',
  'footer_support_url',
  'email_from_name',
  'email_reply_to',
]

const COLOR_FIELDS: (keyof Branding)[] = ['brand_color', 'brand_color_dark']

export async function GET() {
  await requireAdmin()
  return NextResponse.json(getBranding())
}

export async function POST(req: Request) {
  await requireAdmin()
  const body = await req.json()
  const updates: Partial<Branding> = {}

  for (const f of TEXT_FIELDS) {
    if (body[f] !== undefined) {
      const v = String(body[f] || '').trim()
      ;(updates as any)[f] = v || null
    }
  }
  for (const f of COLOR_FIELDS) {
    if (body[f] !== undefined) {
      const v = String(body[f] || '').trim()
      if (v && !isValidHex(v)) {
        return NextResponse.json(
          { error: `${f} must be a hex colour like #2563eb` },
          { status: 400 },
        )
      }
      ;(updates as any)[f] = v
    }
  }

  if (body.portal_name !== undefined && !String(body.portal_name).trim()) {
    return NextResponse.json({ error: 'Portal name cannot be empty' }, { status: 400 })
  }

  setBranding(updates)
  return NextResponse.json({ ok: true })
}
