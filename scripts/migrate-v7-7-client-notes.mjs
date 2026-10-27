// scripts/migrate-v7-7-client-notes.mjs
//
// v7.7 — Per-client clinician notes (OneNote-style, Markdown-backed).
// Adds the client_notes table. Admin-only visibility is enforced at the API layer.
//
// Idempotent: safe to run repeatedly.

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = process.env.DATA_DIR || './data'

const dbFiles = fs.existsSync(DATA_DIR)
  ? fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.db'))
  : []

if (dbFiles.length !== 1) {
  console.error(
    `[v7.7] Expected exactly one .db file in ${DATA_DIR}, found: ` +
    `${dbFiles.join(', ') || 'none'}.\n` +
    `Set DATA_DIR or edit this script to point at your database file.`
  )
  process.exit(1)
}

const db = new Database(path.join(DATA_DIR, dbFiles[0]))

db.exec(`
  create table if not exists client_notes (
    id text primary key,
    client_id text not null references users(id) on delete cascade,
    author_id text references users(id) on delete set null,
    title text,
    body text not null default '',
    pinned integer not null default 0,
    created_at text not null default current_timestamp,
    updated_at text not null default current_timestamp
  );
  create index if not exists idx_client_notes_client
    on client_notes(client_id, pinned desc, updated_at desc);
`)

console.log('  v client_notes table ready')
console.log('v7.7 client-notes migration complete')
db.close()

// After adding this file:
//   1) chain it in scripts/migrate-all.mjs (append after the latest step)
//   2) add to package.json: "migrate:v7-7": "node scripts/migrate-v7-7-client-notes.mjs"
