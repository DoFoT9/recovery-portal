import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import { getBranding, brandingDir, mimeForFilename } from '@/lib/branding'

/**
 * Loads the clinic logo as a base64 data URI for inclusion in the PDF header.
 * Returns null if no logo is configured or the file can't be read.
 */
export function loadLogoDataUri(): string | null {
  const b = getBranding()
  if (!b.logo_filename) return null

  try {
    const abs = path.join(brandingDir(), b.logo_filename)
    if (!fs.existsSync(abs)) return null
    const buf = fs.readFileSync(abs)
    const mime = mimeForFilename(b.logo_filename)
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
