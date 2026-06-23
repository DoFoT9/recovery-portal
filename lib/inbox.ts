import 'server-only'
import { getDb } from './db'

export interface InboxClient {
  client_id: string
  full_name: string | null
  email: string
  unread_count: number
  last_message_body: string | null
  last_message_author_name: string | null
  last_message_author_role: 'admin' | 'client' | null
  last_message_at: string | null
}

/**
 * Total unread client comments across all assignments, for the admin badge.
 * Only counts comments authored by clients that the admin hasn't seen yet.
 *
 * NOTE: Both created_at and last_comments_seen_by_admin_at are wrapped in
 * datetime() to normalise the comparison - SQLite stores `default current_timestamp`
 * as "YYYY-MM-DD HH:MM:SS" (space) while JS `new Date().toISOString()` produces
 * "YYYY-MM-DDTHH:MM:SS.sssZ" (T + Z). String comparison treats them inconsistently.
 */
export function getTotalUnreadCount(): number {
  const db = getDb()
  const row = db.prepare(`
    SELECT COUNT(*) AS c
      FROM assignment_comments c
      JOIN client_assignments ca ON ca.id = c.assignment_id
      JOIN users au              ON au.id = c.author_id
     WHERE au.role = 'client'
       AND (ca.last_comments_seen_by_admin_at IS NULL
            OR datetime(c.created_at) > datetime(ca.last_comments_seen_by_admin_at))
  `).get() as { c: number } | undefined
  return row?.c ?? 0
}

export function getInboxClients(
  opts: { onlyUnread?: boolean; limit?: number } = {},
): InboxClient[] {
  const { onlyUnread = false, limit = 200 } = opts
  const db = getDb()

  const rows = db.prepare(`
    SELECT
      u.id        AS client_id,
      u.full_name AS full_name,
      u.email     AS email,
      (
        SELECT COUNT(*)
          FROM assignment_comments c
          JOIN client_assignments ca ON ca.id = c.assignment_id
          JOIN users au              ON au.id = c.author_id
         WHERE ca.client_id = u.id
           AND au.role = 'client'
           AND (ca.last_comments_seen_by_admin_at IS NULL
                OR datetime(c.created_at) > datetime(ca.last_comments_seen_by_admin_at))
      ) AS unread_count,
      (
        SELECT c.body FROM assignment_comments c
          JOIN client_assignments ca ON ca.id = c.assignment_id
         WHERE ca.client_id = u.id
         ORDER BY c.created_at DESC LIMIT 1
      ) AS last_message_body,
      (
        SELECT au.full_name FROM assignment_comments c
          JOIN client_assignments ca ON ca.id = c.assignment_id
          JOIN users au              ON au.id = c.author_id
         WHERE ca.client_id = u.id
         ORDER BY c.created_at DESC LIMIT 1
      ) AS last_message_author_name,
      (
        SELECT au.role FROM assignment_comments c
          JOIN client_assignments ca ON ca.id = c.assignment_id
          JOIN users au              ON au.id = c.author_id
         WHERE ca.client_id = u.id
         ORDER BY c.created_at DESC LIMIT 1
      ) AS last_message_author_role,
      (
        SELECT c.created_at FROM assignment_comments c
          JOIN client_assignments ca ON ca.id = c.assignment_id
         WHERE ca.client_id = u.id
         ORDER BY c.created_at DESC LIMIT 1
      ) AS last_message_at
    FROM users u
    WHERE u.role = 'client'
    ORDER BY (last_message_at IS NULL), last_message_at DESC
    LIMIT ?
  `).all(limit) as InboxClient[]

  let result = rows.filter(r => r.last_message_at !== null)
  if (onlyUnread) result = result.filter(r => r.unread_count > 0)
  return result
}

/**
 * Mark every assignment_comments thread for a client as read by the admin.
 * Uses SQL-native datetime('now') so the stored format matches default_current_timestamp.
 */
export function markAllClientCommentsRead(clientId: string): void {
  getDb().prepare(`
    UPDATE client_assignments
       SET last_seen_by_admin_at = datetime('now'),
           last_comments_seen_by_admin_at = datetime('now')
     WHERE client_id = ?
  `).run(clientId)
}
