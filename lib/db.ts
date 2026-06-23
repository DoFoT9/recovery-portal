import Database from 'better-sqlite3'
import { dbPath } from '@/lib/paths'

let db: Database.Database | null = null

export function getDb() {
  if (db) return db
  db = new Database(dbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    create table if not exists users (
      id text primary key,
      email text not null unique,
      full_name text,
      password_hash text not null,
      role text not null check(role in ('admin','client')),
      theme_preference text not null default 'system' check(theme_preference in ('light','dark','system')),
      last_active_at text,
      last_seen_clients_at text,
      created_at text not null default current_timestamp
    );

    create table if not exists rehab_types (
      id text primary key,
      name text not null unique,
      description text,
      color text not null default '#6366f1',
      order_index integer not null default 0,
      created_at text not null default current_timestamp
    );

    create table if not exists stages (
      id text primary key,
      rehab_type_id text not null references rehab_types(id) on delete cascade,
      name text not null,
      description text,
      order_index integer not null default 0,
      created_at text not null default current_timestamp
    );

    create table if not exists videos (
      id text primary key,
      title text not null,
      description text,
      rehab_type_id text references rehab_types(id) on delete cascade,
      stage_id text references stages(id) on delete cascade,
      file_path text not null,
      original_name text,
      mime_type text,
      size_bytes integer,
      duration_sec real,
      sets integer,
      reps integer,
      hold_seconds integer,
      target_rom_degrees real,
      exercise_notes text,
      status text not null default 'ready' check(status in ('ready','archived')),
      created_by text references users(id) on delete set null,
      created_at text not null default current_timestamp,
      archived_at text,
      check (rehab_type_id is not null or stage_id is not null)
    );

    create table if not exists client_assignments (
      id text primary key,
      client_id text not null references users(id) on delete cascade,
      rehab_type_id text not null references rehab_types(id) on delete cascade,
      stage_id text references stages(id) on delete cascade,
      status text not null default 'assigned' check(status in ('assigned','in_progress','completed')),
      admin_recommendations text,
      override_sets integer,
      override_reps integer,
      override_hold_seconds integer,
      override_rom_degrees real,
      assigned_by text references users(id) on delete set null,
      assigned_at text not null default current_timestamp,
      started_at text,
      completed_at text,
      last_seen_by_admin_at text,
      last_comments_seen_by_admin_at text
    );

    create table if not exists assignment_comments (
      id text primary key,
      assignment_id text not null references client_assignments(id) on delete cascade,
      author_id text not null references users(id) on delete cascade,
      body text not null,
      created_at text not null default current_timestamp
    );

    create table if not exists milestones (
      id text primary key,
      stage_id text not null references stages(id) on delete cascade,
      title text not null,
      order_index integer not null default 0,
      is_default integer not null default 0,
      created_at text not null default current_timestamp
    );

    create table if not exists client_milestones (
      id text primary key,
      client_id text not null references users(id) on delete cascade,
      milestone_id text not null references milestones(id) on delete cascade,
      completed_at text not null default current_timestamp,
      source text not null default 'manual' check(source in ('manual','video_view')),
      unique(client_id, milestone_id)
    );

    create table if not exists video_views (
      id text primary key,
      client_id text not null references users(id) on delete cascade,
      video_id text not null references videos(id) on delete cascade,
      watched_at text not null default current_timestamp,
      unique(client_id, video_id)
    );

    create table if not exists push_subscriptions (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      endpoint text not null,
      p256dh text not null,
      auth text not null,
      user_agent text,
      created_at text not null default current_timestamp,
      unique(user_id, endpoint)
    );

    create index if not exists idx_stages_type on stages(rehab_type_id, order_index);
    create index if not exists idx_videos_stage on videos(stage_id);
    create index if not exists idx_videos_type on videos(rehab_type_id);
    create index if not exists idx_assignments_client on client_assignments(client_id, status);
    create index if not exists idx_comments_assignment on assignment_comments(assignment_id, created_at);
    create index if not exists idx_milestones_stage on milestones(stage_id, order_index);
    create index if not exists idx_client_milestones_client on client_milestones(client_id);
    create index if not exists idx_video_views_client on video_views(client_id);
    create index if not exists idx_push_user on push_subscriptions(user_id);
  `)

  const count = db.prepare("select count(*) as c from rehab_types").get() as any
  if (count.c === 0) {
    const insertType = db.prepare("insert into rehab_types (id,name,description,color,order_index) values (?,?,?,?,?)")
    insertType.run('knee-surgery', 'Knee Surgery', 'Post-op knee rehabilitation', '#ef4444', 1)
    insertType.run('shoulder-injury', 'Shoulder Injury', 'Shoulder mobility and strengthening', '#3b82f6', 2)
    insertType.run('lower-back', 'Lower Back Pain', 'Core stability and lumbar care', '#f59e0b', 3)

    const insertStage = db.prepare("insert into stages (id,rehab_type_id,name,description,order_index) values (?,?,?,?,?)")
    const insertMs = db.prepare("insert into milestones (id,stage_id,title,order_index,is_default) values (?,?,?,?,1)")

    const stageIds = [
      [crypto.randomUUID(), 'knee-surgery', 'Phase 1: Hydrotherapy', 'Gentle pool-based mobility work', 1],
      [crypto.randomUUID(), 'knee-surgery', 'Phase 2: Stretching Recovery', 'Range-of-motion stretches', 2],
      [crypto.randomUUID(), 'knee-surgery', 'Phase 3: Strength Building', 'Progressive resistance work', 3],
    ]
    for (const row of stageIds) {
      insertStage.run(row[0], row[1], row[2], row[3], row[4])
      insertMs.run(crypto.randomUUID(), row[0], 'Mark this stage as done', 1)
    }
  }

  return db
}

export const id = () => crypto.randomUUID()
