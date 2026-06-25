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
  if (!columnExists('users', 'totp_secret_encrypted')) {
    db.exec("ALTER TABLE users ADD COLUMN totp_secret_encrypted TEXT NULL")
    console.log('  \u2713 Added users.totp_secret_encrypted')
  } else {
    console.log('  \u2022 users.totp_secret_encrypted already present')
  }

  if (!columnExists('users', 'totp_enabled_at')) {
    db.exec("ALTER TABLE users ADD COLUMN totp_enabled_at TEXT NULL")
    console.log('  \u2713 Added users.totp_enabled_at')
  } else {
    console.log('  \u2022 users.totp_enabled_at already present')
  }

  if (!columnExists('users', 'totp_pending')) {
    db.exec("ALTER TABLE users ADD COLUMN totp_pending TEXT NULL")
    console.log('  \u2713 Added users.totp_pending')
  } else {
    console.log('  \u2022 users.totp_pending already present')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_recovery_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      used_at TEXT NULL
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON user_recovery_codes(user_id)')
  console.log('  \u2713 Ensured user_recovery_codes table')

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_trusted_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id_hash TEXT NOT NULL,
      user_agent TEXT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_used_at TEXT NULL,
      expires_at TEXT NOT NULL
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON user_trusted_devices(user_id)')
  console.log('  \u2713 Ensured user_trusted_devices table')

  // Only seed flags if branding table exists (in case migrate-v7-0 hasn't
  // run yet on a legacy install)
  const hasBranding = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='branding'"
  ).get()
  if (hasBranding) {
    const insertFlag = db.prepare(
      "INSERT OR IGNORE INTO branding (key, value) VALUES (?, ?)"
    )
    insertFlag.run('require_2fa_admin', '1')
    insertFlag.run('require_2fa_client', '0')
    console.log('  \u2713 Seeded require_2fa_admin=1, require_2fa_client=0 (idempotent)')
  } else {
    console.log('  \u2022 branding table missing — skipping 2FA flag seeding')
  }

  // Only write to .env.local if TOTP_ENCRYPTION_KEY isn't already set
  // in the environment (Docker entrypoint sets it before this runs)
  if (!process.env.TOTP_ENCRYPTION_KEY) {
    const envPath = path.resolve(process.cwd(), '.env.local')
    try {
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
      if (!envContent.match(/^TOTP_ENCRYPTION_KEY=/m)) {
        const crypto = await import('node:crypto')
        const key = crypto.randomBytes(32).toString('hex')
        const sep = envContent.endsWith('\n') || envContent.length === 0 ? '' : '\n'
        envContent += `${sep}TOTP_ENCRYPTION_KEY=${key}\n`
        fs.writeFileSync(envPath, envContent, { mode: 0o600 })
        console.log('  \u2713 Generated and added TOTP_ENCRYPTION_KEY to .env.local')
      } else {
        console.log('  \u2022 TOTP_ENCRYPTION_KEY already present in .env.local')
      }
    } catch (e) {
      console.log(`  \u2022 Could not write .env.local (${e.code || e.message}) — Docker entrypoint handles secrets`)
    }
  } else {
    console.log('  \u2022 TOTP_ENCRYPTION_KEY already set in environment (managed by Docker entrypoint)')
  }

  console.log('\n\u2713 v7.1 TOTP 2FA migration complete.')
} catch (err) {
  console.error('\u2717 Migration failed:', err)
  process.exit(1)
} finally {
  db.close()
}
