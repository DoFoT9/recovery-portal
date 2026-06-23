import 'server-only'
import { getDb } from './db'

/**
 * The setup wizard is gated by the absence of any admin user.
 * Once an admin exists, /setup is locked permanently.
 */
export function setupIsOpen(): boolean {
  try {
    const db = getDb()
    const row = db.prepare(
      "SELECT COUNT(*) AS c FROM users WHERE role = 'admin'"
    ).get() as { c: number }
    return row.c === 0
  } catch {
    return true
  }
}
