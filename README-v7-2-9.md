# v7.2.9 - Branding asset path fix

Tiny patch fixing a permission-denied error when uploading logos/favicons in Docker.

## What was broken

The branding upload route tried to create `/app/data/branding` instead of `/data/branding` because `lib/branding.ts` -> `brandingDir()` was using `process.cwd() + '/data/branding'` and ignoring the `DATA_DIR` env var.

In Docker:
- `process.cwd()` = `/app` (where the standalone Next.js bundle lives)
- That path is INSIDE the read-only app filesystem, not the volume
- Result: `EACCES: permission denied, mkdir '/app/data/branding'`

The `init-db.mjs` script already respected `DATA_DIR` correctly - only the runtime `brandingDir()` helper was wrong.

## What's fixed

`brandingDir()` now uses:

```ts
const baseDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data')
return path.join(baseDir, 'branding')
```

Behaviour:
- **Docker**: `DATA_DIR=/data` -> uses `/data/branding` (correct, writable)
- **Source install**: no env var -> uses `./data/branding` relative to project root (unchanged)

## Apply and release

```bash
unzip -o rehab-portal-v7-2-9-branding-path-fix.zip -d .
git add lib/branding.ts README-v7-2-9.md
git commit -m "Fix branding asset directory to respect DATA_DIR (v7.2.9)"
git tag v7.2.9
git push origin main --tags
```

## RunTiPi users

After v7.2.9 publishes:

1. RunTiPi -> recovery-portal -> Update/Restart (pulls new image)
2. Try uploading a logo at `/admin/settings/branding`
3. File ends up at `/data/branding/logo-<timestamp>.png` inside the container

The persistent volume keeps it across restarts.

## About the Buffer() deprecation warning

The log also shows:

```
DeprecationWarning: Buffer() is deprecated...
```

This warning is from a transitive dependency (likely older sub-dep of next-pwa or web-push), not from your code. It is cosmetic and will be resolved when those packages update for Node 24. It does not affect functionality. Safe to ignore for now.
