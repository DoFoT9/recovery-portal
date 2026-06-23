import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getBranding, brandingDir, mimeForFilename } from '@/lib/branding'

export async function GET() {
  const b = getBranding()
  if (!b.logo_filename) {
    return NextResponse.json({ error: 'No logo set' }, { status: 404 })
  }
  const file = path.join(brandingDir(), b.logo_filename)
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: 'File missing' }, { status: 404 })
  }
  const buf = await fs.promises.readFile(file)
  return new NextResponse(buf, {
    headers: {
      'Content-Type': mimeForFilename(b.logo_filename),
      'Cache-Control': 'public, max-age=300, must-revalidate',
    },
  })
}
