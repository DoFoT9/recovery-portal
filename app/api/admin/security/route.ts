import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getBranding, setBranding } from '@/lib/branding'

export async function GET() {
  await requireAdmin()
  const b = getBranding() as any
  return NextResponse.json({
    require_2fa_admin: b.require_2fa_admin === '1' || b.require_2fa_admin === undefined,
    require_2fa_client: b.require_2fa_client === '1',
  })
}

export async function POST(req: Request) {
  await requireAdmin()
  const { require_2fa_admin, require_2fa_client } = await req.json()
  const updates: any = {}
  if (typeof require_2fa_admin === 'boolean') updates.require_2fa_admin = require_2fa_admin ? '1' : '0'
  if (typeof require_2fa_client === 'boolean') updates.require_2fa_client = require_2fa_client ? '1' : '0'
  setBranding(updates)
  return NextResponse.json({ ok: true })
}
