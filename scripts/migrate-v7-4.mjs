#!/usr/bin/env node
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'rehab.db')

if (!fs.existsSync(DB_PATH)) {
  console.error('migrate-v7-4: DB not found at ' + DB_PATH)
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

try {
  db.exec(`
    create table if not exists video_frames (
      video_id     text not null references videos(id) on delete cascade,
      slot         integer not null check(slot in (1,2,3,4)),
      file_path    text not null,
      captured_at  text not null default current_timestamp,
      captured_by  text references users(id) on delete set null,
      primary key (video_id, slot)
    );
    create index if not exists idx_video_frames_video on video_frames(video_id);
  `)

  const row = db.prepare("select name from sqlite_master where type='table' and name='video_frames'").get()
  if (row) {
    console.log('  v7.4 video_frames table ready')
  } else {
    console.error('  v7.4 video_frames table NOT created')
    process.exit(1)
  }

  console.log('\nv7.4 frames migration complete.')
} catch (err) {
  console.error('migrate-v7-4 failed:', err)
  process.exit(1)
} finally {
  db.close()
}
