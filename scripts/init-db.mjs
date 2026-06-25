#!/usr/bin/env node
// Creates the COMPLETE current schema.
// This is the canonical fresh-install path — it creates every table the
// current application version needs, in one shot.
//
// The individual migrate-vX-Y.mjs scripts remain for upgrading EXISTING
// installs from older versions. New installs only need this script.
//
// Safe to run multiple times — all DDL uses IF NOT EXISTS / OR IGNORE.

import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'rehab.db')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  console.log(`  \u2713 Created data directory ${DATA_DIR}`)
}

// Also ensure the branding asset directory exists (logos, favicons)
const BRANDING_DIR = path.join(DATA_DIR, 'branding')
if (!fs.existsSync(BRANDING_DIR)) {
  fs.mkdirSync(BRANDING_DIR, { recursive: true })
}

const isFresh = !fs.existsSync(DB_PATH)
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

try {
  // ====================================================================
  // CORE TABLES (v5 baseline + v6.1 disabled_at + v7.1 totp_* on users)
  // ====================================================================

  // users
  db.exec(`
    create table if not exists users (
      id                     text primary key,
      email                  text not null unique,
      full_name              text,
      password_hash          text not null,
      role                   text not null check(role in ('admin','client')),
      created_at             text not null default current_timestamp,
      theme_preference       text not null default 'system'
                               check(theme_preference in ('light','dark','system')),
      last_active_at         text,
      last_seen_clients_at   text,
      disabled_at            text,
      totp_secret_encrypted  text,
      totp_enabled_at        text,
      totp_pending           text
    );
  `)

  // rehab_types
  db.exec(`
    create table if not exists rehab_types (
      id           text primary key,
      name         text not null unique,
      description  text,
      color        text not null default '#6366f1',
      order_index  integer not null default 0,
      created_at   text not null default current_timestamp
    );
  `)

  // stages
  db.exec(`
    create table if not exists stages (
      id             text primary key,
      rehab_type_id  text not null references rehab_types(id) on delete cascade,
      name           text not null,
      description    text,
      order_index    integer not null default 0,
      created_at     text not null default current_timestamp
    );
    create index if not exists idx_stages_type on stages(rehab_type_id, order_index);
  `)

  // videos
  db.exec(`
    create table if not exists videos (
      id                  text primary key,
      title               text not null,
      description         text,
      rehab_type_id       text references rehab_types(id) on delete cascade,
      stage_id            text references stages(id) on delete cascade,
      file_path           text not null,
      original_name       text,
      mime_type           text,
      size_bytes          integer,
      duration_sec        real,
      status              text not null default 'ready'
                            check(status in ('ready','archived')),
      created_by          text references users(id) on delete set null,
      created_at          text not null default current_timestamp,
      archived_at         text,
      sets                integer,
      reps                integer,
      hold_seconds        integer,
      target_rom_degrees  real,
      exercise_notes      text,
      check (rehab_type_id is not null or stage_id is not null)
    );
    create index if not exists idx_videos_stage on videos(stage_id);
    create index if not exists idx_videos_type  on videos(rehab_type_id);
  `)

  // client_assignments
  db.exec(`
    create table if not exists client_assignments (
      id                              text primary key,
      client_id                       text not null references users(id) on delete cascade,
      rehab_type_id                   text not null references rehab_types(id) on delete cascade,
      stage_id                        text references stages(id) on delete cascade,
      status                          text not null default 'assigned'
                                        check(status in ('assigned','in_progress','completed')),
      admin_recommendations           text,
      assigned_by                     text references users(id) on delete set null,
      assigned_at                     text not null default current_timestamp,
      started_at                      text,
      completed_at                    text,
      last_seen_by_admin_at           text,
      last_comments_seen_by_admin_at  text,
      override_sets                   integer,
      override_reps                   integer,
      override_hold_seconds           integer,
      override_rom_degrees            real
    );
    create index if not exists idx_assignments_client on client_assignments(client_id, status);
  `)

  // assignment_comments
  db.exec(`
    create table if not exists assignment_comments (
      id             text primary key,
      assignment_id  text not null references client_assignments(id) on delete cascade,
      author_id      text not null references users(id) on delete cascade,
      body           text not null,
      created_at     text not null default current_timestamp
    );
    create index if not exists idx_comments_assignment on assignment_comments(assignment_id, created_at);
  `)

  // milestones
  db.exec(`
    create table if not exists milestones (
      id           text primary key,
      stage_id     text not null references stages(id) on delete cascade,
      title        text not null,
      order_index  integer not null default 0,
      is_default   integer not null default 0,
      created_at   text not null default current_timestamp
    );
    create index if not exists idx_milestones_stage on milestones(stage_id, order_index);
  `)

  // client_milestones
  db.exec(`
    create table if not exists client_milestones (
      id            text primary key,
      client_id     text not null references users(id) on delete cascade,
      milestone_id  text not null references milestones(id) on delete cascade,
      completed_at  text not null default current_timestamp,
      source        text not null default 'manual'
                      check(source in ('manual','video_view')),
      unique(client_id, milestone_id)
    );
    create index if not exists idx_client_milestones_client on client_milestones(client_id);
  `)

  // video_views
  db.exec(`
    create table if not exists video_views (
      id          text primary key,
      client_id   text not null references users(id) on delete cascade,
      video_id    text not null references videos(id) on delete cascade,
      watched_at  text not null default current_timestamp,
      unique(client_id, video_id)
    );
    create index if not exists idx_video_views_client on video_views(client_id);
  `)

  // push_subscriptions
  db.exec(`
    create table if not exists push_subscriptions (
      id          text primary key,
      user_id     text not null references users(id) on delete cascade,
      endpoint    text not null,
      p256dh      text not null,
      auth        text not null,
      user_agent  text,
      created_at  text not null default current_timestamp,
      unique(user_id, endpoint)
    );
    create index if not exists idx_push_user on push_subscriptions(user_id);
  `)

  // ====================================================================
  // v7.0 — WHITE-LABEL BRANDING
  // ====================================================================

  db.exec(`
    create table if not exists branding (
      key         text primary key,
      value       text,
      updated_at  text default current_timestamp
    );
  `)

  // Seed default 2FA enforcement flags (from v7.1)
  const insertFlag = db.prepare(
    "insert or ignore into branding (key, value) values (?, ?)"
  )
  insertFlag.run('require_2fa_admin',  '1')
  insertFlag.run('require_2fa_client', '0')

  // ====================================================================
  // v7.1 — TOTP 2FA SUPPORT TABLES
  // ====================================================================

  db.exec(`
    create table if not exists user_recovery_codes (
      id          text primary key,
      user_id     text not null references users(id) on delete cascade,
      code_hash   text not null,
      created_at  text default current_timestamp,
      used_at     text
    );
    create index if not exists idx_recovery_codes_user on user_recovery_codes(user_id);
  `)

  db.exec(`
    create table if not exists user_trusted_devices (
      id              text primary key,
      user_id         text not null references users(id) on delete cascade,
      device_id_hash  text not null,
      user_agent      text,
      created_at      text default current_timestamp,
      last_used_at    text,
      expires_at      text not null
    );
    create index if not exists idx_trusted_devices_user on user_trusted_devices(user_id);
  `)

  // ====================================================================
  // Sanity check + report
  // ====================================================================

  const expectedTables = [
    'users','rehab_types','stages','videos','client_assignments',
    'assignment_comments','milestones','client_milestones',
    'video_views','push_subscriptions',
    'branding','user_recovery_codes','user_trusted_devices',
  ]
  const placeholders = expectedTables.map(() => '?').join(',')
  const found = db.prepare(
    `select name from sqlite_master where type='table' and name in (${placeholders}) order by name`
  ).all(...expectedTables).map(r => r.name)

  if (isFresh) {
    console.log(`  \u2713 Created fresh complete schema (${found.length}/${expectedTables.length} tables)`)
  } else {
    console.log(`  \u2022 Schema already present (${found.length}/${expectedTables.length} tables, idempotent — no changes)`)
  }

  const missing = expectedTables.filter(t => !found.includes(t))
  if (missing.length > 0) {
    console.warn(`  \u26A0 Missing tables: ${missing.join(', ')}`)
  }
} catch (err) {
  console.error('\u2717 init-db failed:', err)
  process.exit(1)
} finally {
  db.close()
}
