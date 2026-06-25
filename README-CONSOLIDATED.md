# v7.2.5 CONSOLIDATED — apply everything in one go

This bundle contains every fix from v7.2.1 through v7.2.5 in one safe drop-in
zip. Apply this to bring any v7.2.0-based install fully up to date.

## What's in this bundle

| File | What it fixes |
|---|---|
| `Dockerfile` | v7.2.1 (Node 24) + v7.2.4 (entrypoint + bindings + file-uri-to-path) |
| `docker-compose.yml` | v7.2.4 zero-config (env vars optional, 30s start period) |
| `docker-entrypoint.sh` | v7.2.4 (secret generation + migration runner) |
| `scripts/init-db.mjs` | v7.2.5 (corrected schema matching real v5 baseline) |
| `scripts/migrate-all.mjs` | v7.2.4 (orchestrator) |
| `package.json` | 7.2.5 (Node engines ≥22, better-sqlite3 ^12) |
| `.github/workflows/release.yml` | v7.2.2 (Node 24 native actions) |
| `lib/branding.ts` | v7.2.3 (defensive try/catch) |
| `app/manifest.ts` | v7.2.3 (`force-dynamic`) |
| `app/layout.tsx` | v7.2.3 (`force-dynamic`) |
| `.dockerignore` | v7.2.4 |

## Apply

```bash
cd /opt/rehab-portal
unzip -o rehab-portal-v7-2-5-CONSOLIDATED.zip -d .
chmod +x docker-entrypoint.sh

# Verify locally before tagging
docker compose build --no-cache
docker compose up

# Watch the startup logs. You should see:
#   → Loading secrets from /data/secrets.env (or "Generated AUTH_SECRET")
#   → Initialising database schema and running migrations
#     • Base schema already present (10/10 core tables, no changes)
#   → Starting application
#
# Then http://localhost:3000 should load to your portal as normal
# (since your DB already has data, you go straight to /login, not /setup)

# If green, ship it
git add Dockerfile docker-compose.yml docker-entrypoint.sh \
        scripts/init-db.mjs scripts/migrate-all.mjs \
        .github/workflows/release.yml \
        lib/branding.ts app/manifest.ts app/layout.tsx \
        package.json .dockerignore README-CONSOLIDATED.md
git commit -m "Consolidated v7.2.5 — Docker zero-config, schema correction, all 7.2.x fixes"
git tag v7.2.5
git push origin main --tags
```

## What this guarantees

After applying this bundle, your project is:

- ✅ On Node 24 LTS (Docker + engines field)
- ✅ Has the entrypoint that auto-generates secrets + runs migrations
- ✅ Has init-db.mjs matching your REAL v5 schema (verified against your live DB)
- ✅ Has the prerender-safe layout + manifest
- ✅ Has the GitHub Actions workflow using Node 24 native action versions
- ✅ Has package.json bumped to 7.2.5
- ✅ Bundles every transitive better-sqlite3 dep needed at runtime

## The full v7.2.x journey (for context)

| Version | Fix |
|---|---|
| v7.2.0 | Initial Docker release (broken for fresh installs) |
| v7.2.1 | Bump base image to Node 24 LTS |
| v7.2.2 | Update GitHub Actions to Node 24 native versions |
| v7.2.3 | Fix Docker build prerender SqliteError |
| v7.2.4 | Add Docker entrypoint + init-db + secret auto-gen |
| v7.2.5 | Correct init-db schema to match real v5 baseline |

## After this ships

You will have a genuinely production-ready commercial Docker image at
`ghcr.io/dofot9/recovery-portal:7.2.5`. Fresh customers can:

```bash
git clone https://github.com/DoFoT9/recovery-portal.git
cd recovery-portal
docker compose up -d
# Visit http://localhost:3000/setup
```

And it just works. Onward to v7.3 (email infrastructure). \U0001F680
