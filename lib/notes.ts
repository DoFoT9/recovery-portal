// lib/notes.ts
//
// v7.7 — server helpers for per-client clinician notes.
// All callers must be admins (enforced in the API routes). Notes are never exposed
// to clients.

import 'server-only'
import { getDb, id as newId } from '@/lib/db'

export interface ClientNote {
  id: string
  client_id: string
  author_id: string | null
  author_name: string | null
  title: string | null
  body: string
  pinned: number
  created_at: string
  updated_at: string
}

/** All notes for a client, pinned first then most-recently-updated. */
export function listNotesForClient(clientId: string): ClientNote[] {
  return getDb().prepare(`
    select n.*, u.full_name as author_name
    from client_notes n
    left join users u on u.id = n.author_id
    where n.client_id = ?
    order by n.pinned desc, n.updated_at desc
  `).all(clientId) as ClientNote[]
}

/** Create an empty (or seeded) note and return it. */
export function createNote(clientId: string, authorId: string, title = '', body = ''): ClientNote {
  const db = getDb()
  const id = newId()
  db.prepare(`
    insert into client_notes (id, client_id, author_id, title, body)
    values (?, ?, ?, ?, ?)
  `).run(id, clientId, authorId, title || null, body)
  return db.prepare(`
    select n.*, u.full_name as author_name
    from client_notes n left join users u on u.id = n.author_id
    where n.id = ?
  `).get(id) as ClientNote
}

/** Patch title/body/pinned. Only provided fields change; bumps updated_at. */
export function updateNote(
  noteId: string,
  fields: { title?: string | null; body?: string; pinned?: boolean }
): void {
  const sets: string[] = []
  const vals: any[] = []
  if (fields.title !== undefined) { sets.push('title = ?'); vals.push(fields.title || null) }
  if (fields.body !== undefined) { sets.push('body = ?'); vals.push(fields.body) }
  if (fields.pinned !== undefined) { sets.push('pinned = ?'); vals.push(fields.pinned ? 1 : 0) }
  if (sets.length === 0) return
  sets.push("updated_at = datetime('now')")
  vals.push(noteId)
  getDb().prepare(`update client_notes set ${sets.join(', ')} where id = ?`).run(...vals)
}

export function deleteNote(noteId: string): void {
  getDb().prepare('delete from client_notes where id = ?').run(noteId)
}

/** Used by the API to confirm a note belongs to the given client (defence in depth). */
export function getNoteClientId(noteId: string): string | null {
  const row = getDb().prepare('select client_id from client_notes where id = ?').get(noteId) as any
  return row?.client_id ?? null
}
