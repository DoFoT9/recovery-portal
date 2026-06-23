import 'server-only'
import fs from 'node:fs'
import path from 'node:path'

let cachedVersion: string | null = null

export function getAppVersion(): string {
  if (cachedVersion) return cachedVersion
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'),
    )
    cachedVersion = String(pkg.version || '0.0.0')
  } catch {
    cachedVersion = '0.0.0'
  }
  return cachedVersion
}

export function getCommitHash(): string | null {
  return process.env.COMMIT_HASH || null
}
