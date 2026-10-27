// lib/client-inbox.ts
//
// v7.5.2 (item 5) — Client-side reply inbox helpers.
//
// The admin side already tracks unread CLIENT comments via
// client_assignments.last_comments_seen_by_admin_at. This is the mirror image:
// unread ADMIN replies, computed for the client, using the new
// last_comments_seen_by_client_at column (see migrate-v7-5-2-client-inbox.mjs).

import 'server-only'
import { getDb } from '@/lib/db'

/**
 * Total number of admin replies this client hasn't seen yet, across all of their
 * assignments. Drives the client nav badge + dashboard banner.
 */
export function getClientUnreadReplyCount(clientId: string): number {
  const row = getDb().prepare(`
    select count(*) as c
    from assignment_comments ac
    join client_assignments ca on ca.id = ac.assignment_id
    join users u on u.id = ac.author_id
    where ca.client_id = ?
      and u.role = 'admin'
      and (
        ca.last_comments_seen_by_client_at is null
        or ac.created_at > ca.last_comments_seen_by_client_at
      )
  `).get(clientId) as any
  return row?.c ?? 0
}

/**
 * Summary for the dashboard banner: how many unread admin replies, plus the
 * assignment id of the most recent one so the banner can deep-link straight to it.
 */
export function getClientInboxSummary(
  clientId: string
): { count: number; latestAssignmentId: string | null } {
  const count = getClientUnreadReplyCount(clientId)
  if (count === 0) return { count: 0, latestAssignmentId: null }

  const row = getDb().prepare(`
    select ac.assignment_id as id
    from assignment_comments ac
    join client_assignments ca on ca.id = ac.assignment_id
    join users u on u.id = ac.author_id
    where ca.client_id = ?
      and u.role = 'admin'
      and (
        ca.last_comments_seen_by_client_at is null
        or ac.created_at > ca.last_comments_seen_by_client_at
      )
    order by ac.created_at desc
    limit 1
  `).get(clientId) as any

  return { count, latestAssignmentId: row?.id ?? null }
}

/**
 * Per-assignment unread admin-reply counts, e.g. { 'assignment-id': 2 }.
 * Use to show a badge on each assignment card in the client's list.
 */
export function getClientUnreadByAssignment(clientId: string): Record<string, number> {
  const rows = getDb().prepare(`
    select ac.assignment_id as id, count(*) as c
    from assignment_comments ac
    join client_assignments ca on ca.id = ac.assignment_id
    join users u on u.id = ac.author_id
    where ca.client_id = ?
      and u.role = 'admin'
      and (
        ca.last_comments_seen_by_client_at is null
        or ac.created_at > ca.last_comments_seen_by_client_at
      )
    group by ac.assignment_id
  `).all(clientId) as any[]

  const map: Record<string, number> = {}
  for (const r of rows) map[r.id] = r.c
  return map
}

/**
 * Mark admin replies as seen by the client. Pass an assignmentId to clear just that
 * conversation (call this when the client opens an assignment), or omit it to clear
 * everything (e.g. the banner's dismiss / a "mark all read" action).
 *
 * Uses SQL-native datetime('now') so the stored format matches the default
 * current_timestamp used elsewhere in the schema.
 */
export function markClientRepliesRead(clientId: string, assignmentId?: string): void {
  const db = getDb()
  if (assignmentId) {
    db.prepare(
      `update client_assignments
          set last_comments_seen_by_client_at = datetime('now')
        where client_id = ? and id = ?`
    ).run(clientId, assignmentId)
  } else {
    db.prepare(
      `update client_assignments
          set last_comments_seen_by_client_at = datetime('now')
        where client_id = ?`
    ).run(clientId)
  }
}
