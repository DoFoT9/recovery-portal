#!/usr/bin/env node
// Creates the base v5 schema if not already present.
// Idempotent — safe to run multiple times.
//
// This matches the EXACT schema produced by the original migrate-v5.mjs.
// Later migrations (v6.1, v7.0, v7.1) add columns and tables on top.

import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'rehab.db')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  console.log(`  \u2713 Created data directory ${DATA_DIR}`)
}

const isFresh = !fs.existsSync(DB_PATH)
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

try {
  // --------------------------------------------------------------------
  // users
  // --------------------------------------------------------------------
  db.exec(`
    create table if not exists users (
      id                    text primary key,
      email                 text not null unique,
      full_name             text,
      password_hash         text not null,
      role                  text not null check(role in ('admin','client')),
      created_at            text not null default current_timestamp,
      theme_preference      text not null default 'system'
                              check(theme_preference in ('light','dark','system')),
      last_active_at        text,
      last_seen_clients_at  text
    );
  `)

  // --------------------------------------------------------------------
  // rehab_types
  // --------------------------------------------------------------------
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

  // --------------------------------------------------------------------
  // stages
  // --------------------------------------------------------------------
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

  // --------------------------------------------------------------------
  // videos
  // --------------------------------------------------------------------
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

  // --------------------------------------------------------------------
  // client_assignments
  // --------------------------------------------------------------------
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

  // --------------------------------------------------------------------
  // assignment_comments
  // --------------------------------------------------------------------
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

  // --------------------------------------------------------------------
  // milestones
  // --------------------------------------------------------------------
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

  // --------------------------------------------------------------------
  // client_milestones
  // --------------------------------------------------------------------
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

  // --------------------------------------------------------------------
  // video_views
  // --------------------------------------------------------------------
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

  // --------------------------------------------------------------------
  // push_subscriptions
  // --------------------------------------------------------------------
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

  // Sanity check: count tables we expect to find
  const tableCount = db.prepare(`
    select count(*) as c from sqlite_master
     where type = 'table'
       and name in (
         'users','rehab_types','stages','videos','client_assignments',
         'assignment_comments','milestones','client_milestones',
         'video_views','push_subscriptions'
       )
  `).get().c

  if (isFresh) {
    console.log(`  \u2713 Created fresh v5 base schema (${tableCount}/10 core tables)`)
  } else {
    console.log(`  \u2022 Base schema already present (${tableCount}/10 core tables, no changes)`)
  }
} catch (err) {
  console.error('\u2717 init-db failed:', err)
  process.exit(1)
} finally {
  db.close()
}
