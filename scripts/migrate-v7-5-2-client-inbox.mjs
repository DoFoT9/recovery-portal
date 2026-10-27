// scripts/migrate-v7-5-2-client-inbox.mjs
//
// v7.5.2 (item 5) — Client-side reply inbox.
// Adds the per-assignment "client last saw admin replies" marker so we can compute
// unread admin replies FOR THE CLIENT (the admin side already tracks its own
// last_comments_seen_by_admin_at; this is the mirror for the client).
//
// Idempotent: safe to run repeatedly. Mirrors the column-exists style of the other
// migrate-v7-x scripts.

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = process.env.DATA_DIR || './data'

// Auto-locate the sqlite file so this doesn't hard-code a filename.
const dbFiles = fs.existsSync(DATA_DIR)
  ? fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.db'))
  : []

if (dbFiles.length !== 1) {
  console.error(
    `[v7.5.2] Expected exactly one .db file in ${DATA_DIR}, found: ` +
    `${dbFiles.join(', ') || 'none'}.\n` +
    `Set DATA_DIR or edit this script to point at your database file.`
  )
  process.exit(1)
}

const db = new Database(path.join(DATA_DIR, dbFiles[0]))

const cols = db.prepare(`pragma table_info(client_assignments)`).all()
const hasCol = cols.some(c => c.name === 'last_comments_seen_by_client_at')

if (!hasCol) {
  db.exec(`alter table client_assignments add column last_comments_seen_by_client_at text`)
  console.log('  v Added client_assignments.last_comments_seen_by_client_at')
} else {
  console.log('  . last_comments_seen_by_client_at already present')
}

// Helpful index for the unread-reply lookup.
db.exec(`create index if not exists idx_comments_assignment_created
         on assignment_comments(assignment_id, created_at)`)

console.log('v7.5.2 client-inbox migration complete')
db.close()

// After adding this file:
//   1) chain it in scripts/migrate-all.mjs (append after v7-5-1)
//   2) add to package.json:  "migrate:v7-5-2": "node scripts/migrate-v7-5-2-client-inbox.mjs"
