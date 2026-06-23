# v7.2 — Packaging & deployment

Recovery Portal is now a **commercial-ready, self-hostable product**.

## What you get

- ✅ **Docker image** auto-published to `ghcr.io/dofot9/recovery-portal:VERSION` on every git tag
- ✅ **docker-compose.yml** for one-command deploy
- ✅ **First-run setup wizard** at `/setup` — creates admin + initial branding, then auto-locks
- ✅ **Health check** at `/api/health` for monitoring + container health probes
- ✅ **Version endpoint** at `/api/version` + version badge in admin footer
- ✅ **Structured JSON logging** via `lib/log.ts` — greppable, parsable by Loki/Vector
- ✅ **Backup/restore scripts** for the data directory
- ✅ **Secret generation script** — `./scripts/init-secrets.sh`
- ✅ **PolyForm Small Business 1.0.0 licence** — small clinics free, larger customers contact for commercial licence
- ✅ **Complete `.env.example`** documenting every config knob
- ✅ **README.md** and **CONTRIBUTING.md** for the public repo
- ✅ **GitHub Actions** workflow auto-building multi-arch (amd64 + arm64) Docker images

## Install (Docker — recommended)

```bash
git clone https://github.com/DoFoT9/recovery-portal.git
cd recovery-portal
./scripts/init-secrets.sh
docker compose up -d
```

Open http://localhost:3000/setup.

## Install (from source)

```bash
git clone https://github.com/DoFoT9/recovery-portal.git
cd recovery-portal
./scripts/init-secrets.sh
npm install
npm run migrate:all
npm run build
npm run start
```

## Release flow (for you, the maintainer)

```bash
# Bump version in package.json
git add . && git commit -m "Release v7.2.0"
git tag v7.2.0
git push origin main --tags
# GitHub Actions builds + pushes the image to GHCR automatically
```

## Roadmap

- v7.0 ✅ White-label
- v7.1 ✅ TOTP 2FA
- v7.2 ✅ Packaging (this release)
- v7.3 🔘 Email infrastructure (next)

## Notes

- Setup wizard auto-locks after the first admin is created. Re-opening it requires manually deleting all admin rows from the DB (intentional safety).
- The Docker image is multi-arch (amd64 + arm64) so it runs on cloud VPSes and Raspberry Pi-class ARM hardware alike.
- `data/` is the only state that needs backing up — everything else is rebuilt from the image.
- The `migrate:all` script runs every migration in order, idempotently. Safe to re-run.
- Version badge in the admin footer shows e.g. `v7.2.0 · a1b2c3d` when the Docker build embeds the commit hash.
