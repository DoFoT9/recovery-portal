# Recovery Portal — v7 Roadmap

Living document tracking the v7 release line. Updated as we ship.
Drop this file at the project root and edit it as decisions land.

## Status legend
- 🔘 Planned
- 🟡 In progress
- ✅ Shipped

## Current focus
**v7.0 — White-label / branding** 🟡

---

## v7.0 — White-label / branding 🟡

### Goal
Make the portal feel like the customer owns it. Drop-in branding any clinic
can configure through an admin Settings page, no code changes required.

### Scope
- [ ] Settings page at `/admin/settings/branding`
- [ ] Logo upload (stored in `data/branding/`, served via `/api/branding/logo`)
- [ ] Brand colour picker — primary + accent. Overrides Tailwind `brand`
  colour at runtime via CSS variables in `<head>`
- [ ] Custom portal name (replaces "Recovery Portal" everywhere — page
  titles, nav header, login screen, browser tab)
- [ ] Custom tagline on login page
- [ ] Custom favicon upload
- [ ] Email "From" name + reply-to address (stored now, used in v7.3)
- [ ] Footer customisation (clinic name, contact, ABN, support URL)
- [ ] All branding stored in a single `branding` table with key/value rows,
  cached server-side

### Acceptance criteria
- Two installs with different `branding` rows render visually distinct
- Default branding (no customisations applied) still looks identical to today
- No restart required after changing branding — next page load picks it up
- Logo + favicon files survive `npm run build`

### Out of scope (deferred)
- Custom CSS / advanced theming
- Multi-org branding (different brand per tenant — v7.4+)
- Custom domain handling (not our problem at this layer)

---

## v7.1 — TOTP 2FA 🔘

### Goal
Industry-standard TOTP (Google Auth / Authy / Bitwarden / 1Password)
two-factor authentication. Optional for all users, enforceable for admins.

### Scope
- [ ] Schema: `users.totp_secret` (encrypted), `users.totp_enabled_at`,
  `user_recovery_codes` table
- [ ] Enrolment flow at `/account/2fa/enrol` — QR code (via `qrcode`
  package) + manual secret display
- [ ] Verification step before activation (prove the user has set it up
  correctly)
- [ ] 10 single-use recovery codes shown once, downloadable as `.txt`
- [ ] Login flow: after password, prompt for TOTP code if enabled
- [ ] "Trust this device for 30 days" cookie (signed JWT bound to user +
  device fingerprint)
- [ ] Disable 2FA flow — requires current password + valid TOTP code
- [ ] Admin setting: "Require 2FA for all admins" toggle
- [ ] Admin setting: "Require 2FA for all clients" toggle (off by default)
- [ ] Recovery code redemption flow — consume one + force re-enrolment

### Acceptance criteria
- A user can enrol, log out, log back in with TOTP, and succeed
- Trust-device cookie skips TOTP for 30 days from that device
- Lost-phone scenario solvable with recovery code
- Disabling 2FA requires both password AND current code

### Out of scope
- WebAuthn / passkeys (future v8?)
- SMS-based 2FA (deliberately — high cost, low security)
- Email magic codes (deferred until email infrastructure lands in v7.3)

---

## v7.2 — Packaging & deployment 🔘

### Goal
Self-hosted in one command. Customers (or you-hosting-for-them) can deploy
on a fresh VPS in minutes. Foundation for a commercial product.

### Scope
- [ ] `Dockerfile` (multi-stage, Node 22, ~150MB final image)
- [ ] `docker-compose.yml` with bind-mounted `data/` volume for SQLite +
  uploads
- [ ] `.env.example` documenting every config knob with comments
- [ ] First-run setup wizard at `/setup` — creates admin account, sets
  initial branding, generates `AUTH_SECRET` if missing. Auto-disables
  itself once an admin exists.
- [ ] Health check endpoint `/api/health` (DB connectivity + version +
  uptime)
- [ ] Structured logging (JSON to stdout, switchable to pretty in dev)
- [ ] Backup script `scripts/backup.sh` — tars `data/` to timestamped
  archive
- [ ] Restore script `scripts/restore.sh` — extracts an archive over
  `data/` after confirmation
- [ ] `LICENSE` file — commercial-friendly licence (see Decisions log)
- [ ] `package.json` `version` field as single source of truth
- [ ] Version + commit hash visible in admin footer

### Acceptance criteria
- `docker compose up` on a fresh machine reaches `/setup` in <60s
- Setup wizard creates working admin, never re-runs after completion
- Backup produces a self-contained archive that restores cleanly
- Logs are greppable + parseable by tools like Loki/Vector

### Out of scope
- Kubernetes manifests (overkill for the audience)
- Auto-updates (manual `docker compose pull` is fine for now)
- Telemetry / phone-home (deliberately none — privacy posture)

---

## v7.3 — Email infrastructure 🔘

### Goal
Send branded transactional email. Customer-configurable provider.
Enables password reset (currently the biggest UX gap).

### Scope
- [ ] Pluggable email adapter interface in `lib/email/`
- [ ] Adapters: `smtp` (nodemailer), `resend`, `postmark`, `ses`,
  `console` (logs to stdout for dev)
- [ ] Provider selected via env var `EMAIL_PROVIDER=resend|smtp|...`
- [ ] Template rendering with branding baked in (logo URL, brand colour,
  portal name from v7.0)
- [ ] Templates: `password-reset`, `welcome-client`, `admin-2fa-enabled`
  (audit notice)
- [ ] Password reset flow — single-use token, 1h expiry, stored hashed
- [ ] Welcome email on client creation — option to send temp password OR
  magic set-password link
- [ ] Reusable `sendBrandedEmail({ to, template, vars })` helper
- [ ] Settings page → email test button (sends a test message to the
  admin's address)
- [ ] Rate limiting (max 5 password reset requests per email per hour)

### Acceptance criteria
- Switching providers requires only env var change + restart
- Password reset works end-to-end with all 4 production providers tested
- Customer's logo + brand colour visible in the email
- Console adapter shows full rendered output for local dev with no creds

### Out of scope
- Marketing / newsletter sends (wrong tool)
- Inbound email parsing
- Email-based 2FA (use TOTP from v7.1)

---

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-23 | Single-tenant self-hosted as primary deployment model | Matches Jordan's GLITCHES-IT pattern + Proxmox infrastructure. Hybrid hosting offered as a paid service later. |
| 2026-06-23 | Multi-tenancy deferred indefinitely | 90% of small-clinic sales don't need it. Revisit when paying customers actually ask. |
| 2026-06-23 | Email infrastructure deferred to v7.3 | Password reset is the only critical blocker; everything else can use existing PWA push. Lets v7.0/v7.1 ship without email dependency. |
| 2026-06-23 | TOTP-only for 2FA in v7.1 | Industry default for healthcare-adjacent apps. No SMS costs, works offline, no third-party dependency. WebAuthn/passkeys deferred to v8. |
| 2026-06-23 | Roadmap reordered: branding → 2FA → packaging → email | Lets early adopters trial the branded portal without needing email or Docker. Packaging consolidates everything into a clean v7.2 "production ready" milestone. |
| TBD | Commercial licence choice for v7.2 | Options on the table: **BSL** (Business Source License — like Sentry/Cockroach, free until customer revenue threshold), **AGPL-3.0** (copyleft, common for self-hosted SaaS like Mastodon), or **PolyForm Small Business**. Pick before v7.2 ships. |

## Open questions to resolve

### Before v7.0
- [ ] Default brand colour if no customisation? Stick with current
  `#6366f1` (indigo)?
- [ ] Max logo file size? (suggest 1 MB)
- [ ] Acceptable logo file types? (suggest PNG, SVG, WEBP)

### Before v7.1
- [ ] Encryption key for TOTP secrets — reuse `AUTH_SECRET` or add a new
  `TOTP_ENCRYPTION_KEY`?
- [ ] Recovery code format — `XXXXX-XXXXX` (alphanumeric 10 chars) or
  `XXXX-XXXX-XXXX-XXXX`?
- [ ] Trust-device cookie name? Suggest `rv_trusted_device`.

### Before v7.2
- [ ] Final commercial licence choice (BSL vs AGPL vs PolyForm)
- [ ] Default Docker image registry — Docker Hub, GHCR, or self-hosted?
- [ ] Setup wizard URL — `/setup` or `/install`?

### Before v7.3
- [ ] Default email provider in docs — Resend (modern, generous free tier)
  seems strongest
- [ ] Password reset token format — JWT or random opaque token in DB?

---

## Future ideas (post-v7, no commitment yet)

- **v7.4** Multi-clinician roles (owner / clinician / receptionist)
- **v7.5** Multi-organisation tenancy (if real demand)
- **v8.0** WebAuthn / passkeys 2FA
- **v8.1** API tokens for integrations
- **v8.2** Audit log (admin actions)
- **v8.3** Per-client data export (PDF / CSV portability)
- **v8.4** Marketplace of rehab type templates (community-contributed)
- **v8.5** Multilingual UI (i18n)
- **v8.6** WCAG 2.2 AA accessibility audit
- **v9.0** Hybrid hosted offering (you operate, customers configure)
