import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import {
  setBranding,
  brandingDir,
  extForMime,
  isSafeSvg,
  getBranding,
} from '@/lib/branding'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_KINDS = ['logo', 'favicon'] as const
type Kind = (typeof ALLOWED_KINDS)[number]

export async function POST(req: Request) {
  await requireAdmin()
  const form = await req.formData()
  const file = form.get('file') as File | null
  const kindRaw = String(form.get('kind') || '')

  if (!ALLOWED_KINDS.includes(kindRaw as Kind)) {
    return NextResponse.json({ error: 'kind must be logo or favicon' }, { status: 400 })
  }
  const kind = kindRaw as Kind

  if (!file) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large — max ${MAX_BYTES / 1024 / 1024} MB` },
      { status: 413 },
    )
  }

  const ext = extForMime(file.type)
  if (!ext) {
    return NextResponse.json(
      { error: 'Unsupported file type — PNG, JPG, or SVG only' },
      { status: 415 },
    )
  }

  const buf = Buffer.from(await file.arrayBuffer())

  if (ext === 'svg') {
    const content = buf.toString('utf8')
    if (!isSafeSvg(content)) {
      return NextResponse.json(
        { error: 'SVG contains disallowed content (scripts, event handlers, etc.)' },
        { status: 400 },
      )
    }
  }

  const filename = `${kind}-${Date.now()}.${ext}`
  const targetPath = path.join(brandingDir(), filename)
  await fs.writeFile(targetPath, buf)

  const current = getBranding()
  const previous =
    kind === 'logo' ? current.logo_filename : current.favicon_filename
  if (previous && previous !== filename) {
    try {
      await fs.unlink(path.join(brandingDir(), previous))
    } catch {
      /* fine if already gone */
    }
  }

  setBranding(
    kind === 'logo'
      ? { logo_filename: filename }
      : { favicon_filename: filename },
  )

  return NextResponse.json({ ok: true, filename })
}
