#!/usr/bin/env node
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'rehab.db')

if (!fs.existsSync(DB_PATH)) {
  console.error(`\u2717 DB not found at ${DB_PATH}. Run init-db first.`)
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function columnExists(table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all()
  return rows.some(r => r.name === col)
}

try {
  if (!columnExists('client_assignments', 'programme_title')) {
    db.exec("ALTER TABLE client_assignments ADD COLUMN programme_title TEXT NULL")
    console.log('  \u2713 Added client_assignments.programme_title')
  } else {
    console.log('  \u2022 client_assignments.programme_title already present')
  }
  console.log('\n\u2713 v7.4.5 programme title override migration complete.')
} catch (err) {
  console.error('\u2717 Migration failed:', err)
  process.exit(1)
} finally {
  db.close()
}
