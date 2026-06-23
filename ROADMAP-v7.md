# Recovery Portal — v7 Roadmap

Living document tracking the v7 release line. Updated as we ship.

## Status legend
- 🔘 Planned
- 🟡 In progress
- ✅ Shipped

## Current focus
**v7.3 — Email infrastructure** 🔘

---

## v7.0 — White-label / branding ✅

Shipped 2026-06-23. See README-v7-0.md.

---

## v7.1 — TOTP 2FA ✅

Shipped 2026-06-23. See README-v7-1.md.

---

## v7.2 — Packaging & deployment ✅

Shipped 2026-06-23. See README-v7-2.md.

Highlights:
- Multi-stage Dockerfile + docker-compose.yml
- Setup wizard at /setup (locks after first admin)
- Health check at /api/health, version at /api/version
- Structured JSON logging
- Backup/restore scripts
- GitHub Actions auto-publishes to ghcr.io/dofot9/recovery-portal on `v*.*.*` tags
- PolyForm Small Business 1.0.0 licence

---

## v7.3 — Email infrastructure 🔘

### Goal
Send branded transactional email. Customer-configurable provider.
Enables password reset (currently the biggest UX gap).

### Scope
- [ ] Pluggable email adapter interface in `lib/email/`
- [ ] Adapters: `smtp` (nodemailer), `resend`, `postmark`, `ses`, `console`
- [ ] Provider selected via env var `EMAIL_PROVIDER=resend|smtp|...`
- [ ] Template rendering with branding baked in
- [ ] Templates: `password-reset`, `welcome-client`, `admin-2fa-enabled`
- [ ] Password reset flow — single-use token, 1h expiry
- [ ] Welcome email on client creation
- [ ] Reusable `sendBrandedEmail({ to, template, vars })` helper
- [ ] Settings page → email test button
- [ ] Rate limiting (max 5 password reset requests per email per hour)

---

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-23 | Single-tenant self-hosted as primary deployment model | Matches Jordan's pattern. |
| 2026-06-23 | Multi-tenancy deferred indefinitely | 90% of small-clinic sales don't need it. |
| 2026-06-23 | Email infrastructure deferred to v7.3 | TOTP works without email. |
| 2026-06-23 | TOTP-only for 2FA in v7.1 | Industry default for healthcare. |
| 2026-06-23 | PolyForm Small Business 1.0.0 chosen as the licence | Plain English, no-lawyers-required for small clinics. Better fit than BSL or AGPL for a sole trader. |
| 2026-06-23 | GitHub + GHCR for distribution | Free hosting for public artefacts, GitHub Actions for zero-config CI/CD. |
| 2026-06-23 | Setup wizard URL is `/setup` | Industry convention. |
| 2026-06-23 | Copyright holder: "Jordan Gall" (sole trader) | Simplest legal structure. |
| 2026-06-23 | Repo: https://github.com/DoFoT9/recovery-portal | Jordan's GitHub. |

## Future ideas (post-v7)

- v7.4 Multi-clinician roles
- v8.0 WebAuthn / passkeys
- v8.1 API tokens
- v8.2 Audit log
- v8.3 Data export (PDF/CSV)
- v8.4 Rehab template marketplace
- v8.5 i18n
- v8.6 WCAG 2.2 AA accessibility audit
- v9.0 Hybrid hosted offering
