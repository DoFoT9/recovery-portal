#!/usr/bin/env node
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'rehab.db')

if (!fs.existsSync(DB_PATH)) {
  console.error('\u2717 DB not found. Run init-db first.')
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

function columnExists(table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(r => r.name === col)
}

const columns = [
  ['transcript_status', "TEXT NOT NULL DEFAULT 'none'"],
  ['transcript_text', 'TEXT'],
  ['transcript_started_at', 'TEXT'],
  ['transcript_completed_at', 'TEXT'],
  ['transcript_error', 'TEXT'],
  ['transcript_dismissed_at', 'TEXT'],
]

try {
  for (const [name, type] of columns) {
    if (!columnExists('videos', name)) {
      db.exec(`ALTER TABLE videos ADD COLUMN ${name} ${type}`)
      console.log(`  \u2713 Added videos.${name}`)
    } else {
      console.log(`  \u2022 videos.${name} already present`)
    }
  }
  console.log('\n\u2713 v7.5.1 transcription schema migration complete.')
} catch (err) {
  console.error('\u2717 Migration failed:', err)
  process.exit(1)
} finally {
  db.close()
}
