// scripts/migrate-v7-6-onboarding.mjs
//
// v7.6 — Admin onboarding tour.
// Adds users.onboarding_completed_at so the guided spotlight tour auto-launches on
// an admin's first login and never nags again once finished/skipped.
//
// Idempotent: safe to run repeatedly. Mirrors the column-exists style of the other
// migrate-v7-x scripts.

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = process.env.DATA_DIR || './data'

const dbFiles = fs.existsSync(DATA_DIR)
  ? fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.db'))
  : []

if (dbFiles.length !== 1) {
  console.error(
    `[v7.6] Expected exactly one .db file in ${DATA_DIR}, found: ` +
    `${dbFiles.join(', ') || 'none'}.\n` +
    `Set DATA_DIR or edit this script to point at your database file.`
  )
  process.exit(1)
}

const db = new Database(path.join(DATA_DIR, dbFiles[0]))

const cols = db.prepare(`pragma table_info(users)`).all()
const hasCol = cols.some(c => c.name === 'onboarding_completed_at')

if (!hasCol) {
  db.exec(`alter table users add column onboarding_completed_at text`)
  console.log('  v Added users.onboarding_completed_at')
} else {
  console.log('  . onboarding_completed_at already present')
}

console.log('v7.6 onboarding migration complete')
db.close()

// After adding this file:
//   1) chain it in scripts/migrate-all.mjs (append after the latest step)
//   2) add to package.json: "migrate:v7-6": "node scripts/migrate-v7-6-onboarding.mjs"
