# v7.2.6 - Docker permissions fix

Patch fixing a `permission denied` crash that hit Docker users when the host
mounted the data volume with non-matching ownership (common with RunTiPi,
Unraid, k3s, and any orchestrator that does not align UIDs).

## What was broken

The v7.2.5 image ran as `nextjs` (UID 1001) immediately on container start.
When the bind-mounted `/data` volume came in owned by root (UID 0), the
nextjs user could not create `/data/secrets.env` -> entrypoint crashed ->
container restart loop:

```
/usr/local/bin/docker-entrypoint.sh: line 47:
  can't create /data/secrets.env: Permission denied
chmod: /data/secrets.env: No such file or directory
```

This worked under plain `docker compose up` because Compose tolerates the
mismatch in many setups, but RunTiPi (and other strict orchestrators)
expose the bug.

## What's fixed

Two changes:

1. **`Dockerfile`** - container now starts as root (the `USER nextjs` line
   is removed), and `su-exec` is installed alongside `tini`.

2. **`docker-entrypoint.sh`** - added an initial `chown -R 1001:1001 /data`
   step (only if we are root and only if the dir is not already owned by
   the app user), then `su-exec`s down to the nextjs user before running
   migrations and the app.

## Why this is the right pattern

This is the same pattern used by Postgres, Vaultwarden, Caddy, Gitea,
Mastodon, and most other production self-hosted images. Starting as root,
fixing volume ownership, then dropping privileges via su-exec is the
standard "play well with arbitrary orchestrators" approach.

The container still ends up running the Next.js process as the unprivileged
`nextjs` user - exactly the same security posture as v7.2.5. The
difference is the brief root window at startup to fix permissions.

## Apply and release

```bash
unzip -o rehab-portal-v7-2-6-permissions-fix.zip -d .
git add Dockerfile docker-entrypoint.sh README-v7-2-6.md
git commit -m "Fix Docker bind-mount permission errors (v7.2.6)"
git tag v7.2.6
git push origin main --tags
```

## RunTiPi users - try again

After v7.2.6 publishes to GHCR:

1. RunTiPi -> recovery-portal -> Stop
2. RunTiPi -> recovery-portal -> Update (pulls v7.2.6)
3. RunTiPi -> recovery-portal -> Start

You should now see:

```
-> Fixing ownership of /data (was uid=0, setting to 1001:1001)
-> Loading secrets from /data/secrets.env (or generating)
-> Initialising database schema and running migrations
-> Starting application
```

The "Fixing ownership" line only appears once - subsequent starts skip it
because the directory is already owned correctly.

## Future-proofing

The entrypoint now also honours `APP_UID` and `APP_GID` env vars so anyone
running the container with a different downstream user (e.g. PUID/PGID
patterns from linuxserver.io style images) can override.
