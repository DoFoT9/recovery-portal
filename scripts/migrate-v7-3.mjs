#!/usr/bin/env node
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'rehab.db')
if (!fs.existsSync(DB_PATH)) { console.error('\u2717 DB not found. Run init-db first.'); process.exit(1) }

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON')

try {
  db.exec(`
    create table if not exists password_reset_codes (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      code_hash text not null,
      created_at text default current_timestamp,
      expires_at text not null, used_at text, requester_ip text
    );
    create index if not exists idx_pwreset_user on password_reset_codes(user_id);
    create index if not exists idx_pwreset_unused on password_reset_codes(user_id, used_at);
    create table if not exists email_setup_tokens (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      token_hash text not null,
      kind text not null default 'welcome' check(kind in ('welcome','password_reset_link')),
      created_at text default current_timestamp,
      expires_at text not null, used_at text
    );
    create index if not exists idx_setup_user on email_setup_tokens(user_id);
  `)
  console.log('  \u2713 Ensured password_reset_codes + email_setup_tokens tables')

  const f = db.prepare("insert or ignore into branding (key, value) values (?, ?)")
  f.run('email_provider','console'); f.run('smtp_host','')
  f.run('smtp_port','587'); f.run('smtp_secure','0')
  f.run('smtp_user',''); f.run('smtp_password_encrypted','')
  f.run('smtp_from_email',''); f.run('email_send_welcome','1')
  f.run('app_base_url','')
  console.log('  \u2713 Seeded email config defaults')
  console.log('\n\u2713 v7.3 email infrastructure migration complete.')
} catch (err) {
  console.error('\u2717 Migration failed:', err); process.exit(1)
} finally { db.close() }
