# v7.2.5 — Schema correction

Patch correcting the `init-db.mjs` schema to exactly match the original v5
baseline. v7.2.4 shipped a best-guess schema that diverged from reality in
~15 places; this release ships the verified-against-live-DB version.

## Why this matters

The v7.2.4 `init-db.mjs` would have created a slightly-wrong schema for
**fresh Docker users** — meaning new customers would have hit
`no such column` errors at runtime even though their existing installs worked.

**Your existing live DB is completely safe.** `CREATE TABLE IF NOT EXISTS`
doesn't touch tables that already exist, so the wrong schema in v7.2.4
never affected anyone running an upgrade — only first-time installs.

## What was wrong

The v7.2.4 schema differed from the real one in these ways:

| Table | Difference |
|---|---|
| `users` | Had `COLLATE NOCASE` on email; reality is plain UNIQUE with `lower()` in queries. Missing the theme_preference CHECK constraint. |
| `rehab_types` | Missing `description` column. Missing UNIQUE on name. Default colour was `#2563eb` (blue) instead of `#6366f1` (brand purple). |
| `stages` | Missing `description` column. Index was single-column, not composite. |
| `milestones` | Had a `description` column that does not exist. Missing the `is_default` integer column. |
| `videos` | Missing 8 columns: `original_name`, `size_bytes`, `archived_at`, `sets`, `reps`, `hold_seconds`, `target_rom_degrees`, `exercise_notes`. Missing the table-level CHECK constraint. Had `duration_seconds INTEGER` instead of `duration_sec REAL`. Had `exercise_metadata_json` which is not in the real schema. Status check allowed any value instead of `('ready','archived')`. |
| `client_assignments` | Missing `assigned_by` FK. Missing 4 `override_*` columns for per-assignment exercise customisation. |
| `client_milestones` | Had `completed_by` that does not exist. Missing `source` column (manual vs video_view). |
| `video_views` | Missing `UNIQUE(client_id, video_id)` constraint. |
| `push_subscriptions` | Missing `user_agent` column. UNIQUE was on `endpoint` alone; reality is `UNIQUE(user_id, endpoint)`. |
| Indexes | Several indexes were single-column; reality uses composite indexes for the common query patterns. |

## What the fix does

`scripts/init-db.mjs` is now byte-for-byte aligned with the real v5 schema
verified against the live database. All later migration scripts
(`migrate-v6-1`, `migrate-v7-0`, `migrate-v7-1`) continue to ADD their
columns and tables on top of this corrected baseline, exactly as before.

## Apply and release

```bash
unzip -o rehab-portal-v7-2-5-schema-fix.zip -d .
git add scripts/init-db.mjs README-v7-2-5.md
git commit -m "Correct init-db schema to match v5 baseline (v7.2.5)"
git tag v7.2.5
git push origin main --tags
```

## How to verify

Spin up a fresh Docker container with no existing data and confirm the
schema matches what the app expects:

```bash
docker compose down -v                 # WARNING: wipes data
docker compose up -d

# Wait 30 seconds for migrations
docker exec recovery-portal node -e "
  const db = require('better-sqlite3')('/data/rehab.db', { readonly: true })
  for (const t of ['users','rehab_types','stages','videos','client_assignments',
                   'assignment_comments','milestones','client_milestones',
                   'video_views','push_subscriptions']) {
    const cols = db.prepare(\\\`pragma table_info(\\\${t})\\\`).all()
    console.log(t.padEnd(25), cols.length + ' columns')
  }
"
```

Expected output (column counts include v6.1/v7.0/v7.1 additions):

```
users                     12 columns   (9 base + disabled_at + 3 totp_*)
rehab_types               6 columns
stages                    6 columns
videos                    20 columns
client_assignments        16 columns
assignment_comments       5 columns
milestones                6 columns
client_milestones         6 columns
video_views               5 columns
push_subscriptions        8 columns
```

Then http://localhost:3000/setup should load without errors.

## Why this happened

When I wrote the original `init-db.mjs` in v7.2.4, I reconstructed the
schema from memory of what the app code touches, rather than reading the
actual `migrate-v5.mjs`. That was a lazy shortcut and it bit us. The
corrected version was built against the real schema dump from the live DB.

Lesson learned: when reverse-engineering a schema from app code, ALWAYS
verify against a real instance before shipping.
