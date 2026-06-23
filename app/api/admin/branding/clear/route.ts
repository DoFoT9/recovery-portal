import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getBranding, setBranding, brandingDir } from '@/lib/branding'

export async function POST(req: Request) {
  await requireAdmin()
  const { kind } = await req.json()
  if (kind !== 'logo' && kind !== 'favicon') {
    return NextResponse.json({ error: 'kind must be logo or favicon' }, { status: 400 })
  }
  const current = getBranding()
  const filename = kind === 'logo' ? current.logo_filename : current.favicon_filename
  if (filename) {
    try {
      await fs.unlink(path.join(brandingDir(), filename))
    } catch {
      /* fine */
    }
  }
  setBranding(
    kind === 'logo'
      ? { logo_filename: null }
      : { favicon_filename: null },
  )
  return NextResponse.json({ ok: true })
}
