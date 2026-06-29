# v7.4 - PDF Programme Generator - Progress Tracker

**Living document.** Update this file as each patch is committed.

**Goal:** Generate a printable, branded PDF of each client's exercise programme with 4 photo snippets per video manually captured by the clinician via a scrubber UI. Matches the QLD reference sample.

**Last updated:** 2026-06-29

## Status: COMPLETE

`[##########] 5 / 5 patches shipped`

| Patch  | Status      | Goal                              |
|--------|-------------|-----------------------------------|
| v7.4.1 | Shipped     | Schema + frame storage API        |
| v7.4.2 | Shipped     | Frame capture UI (video scrubber) |
| v7.4.3 | Shipped     | Playwright + basic PDF endpoint   |
| v7.4.4 | Shipped     | Full PDF layout matching QLD sample (+ hotfix for frame path resolution) |
| v7.4.5 | Shipped     | Polish + programme title override + email delivery |

## Architecture decisions (final)

- Browser-side frame capture via canvas - no FFmpeg dependency
- Playwright HTML to PDF over pdfkit - CSS skills, pixel-perfect match
- 4 manually-captured slots per video matching the 2x2 grid in QLD reference
- Storage: DATA_DIR/videos/{video_id}/frames/{slot}.jpg
- file_path stored relative to DATA_DIR (confirmed by v7.4.4 hotfix diagnostics)
- video_frames table with UNIQUE(video_id, slot)
- Inline base64 data URIs in PDF - self-contained, survives forwarding/archiving
- Dedicated edit page for videos (v7.4.2) - /admin/videos/[id]/edit with tabs
- Debian-slim runtime image (v7.4.3) - Alpine + Chromium is unmaintained
- Cached single Chromium browser instance (v7.4.3) - one launch per process
- Brand colour pulled from v7.0 branding (v7.4.4) - CSS variable injected
- programme_title override per assignment (v7.4.5) - wins over rehab_type.name
- Buttons live on the assignment detail page (v7.4.5) - one place for both admin and client
- Email confirm modal (v7.4.5) - real modal not browser confirm()
- Filename pattern: {client_name}-{programme_title}-{YYYY-MM-DD}.pdf (v7.4.5)

## v7.4.5 scope

- [x] Migration: ALTER TABLE client_assignments ADD COLUMN programme_title TEXT NULL
- [x] programme_title override wins over rehab_type.name in PDF context
- [x] Admin-only title input on the assignment detail page
- [x] Filename pattern: {client_name}-{programme_title}-{YYYY-MM-DD}.pdf
- [x] Email programme as PDF button with confirm modal
- [x] New email template "programme-pdf" with branded HTML and plain text
- [x] EmailMessage extended with optional attachments[] field
- [x] SMTP adapter passes attachments through to nodemailer
- [x] Client-facing Download button on their own assignment page
- [x] PDF endpoint now allows the client owner to download (was admin-only)
- [x] migrate-all.mjs updated to include migrate-v7-4-5.mjs

## Files changed in v7.4.5

- scripts/migrate-v7-4-5.mjs (new)
- scripts/migrate-all.mjs (updated)
- lib/email/types.ts (updated)
- lib/email/adapters/smtp.ts (updated)
- lib/email/adapters/console.ts (updated)
- lib/email/templates.ts (updated)
- lib/email/send.ts (updated)
- lib/pdf/build-context.ts (updated)
- app/api/admin/assignments/[id]/programme.pdf/route.ts (updated)
- app/api/admin/assignments/[id]/email-pdf/route.ts (new)
- app/api/assignments/[id]/route.ts (updated)
- app/(client)/assignment/[id]/page.tsx (updated)
- components/admin/ProgrammeAdminToolbar.tsx (new)
- components/client/ProgrammePdfDownloadButton.tsx (new)
- components/admin/ProgrammePdfButton.tsx - DELETE (orphaned from v7.4.3)

## Open questions (deferred to future)

- "Suggest frames" auto-extraction at 10/35/65/90% - v7.4.6 candidate
- Watermark overlay on frames (QLD turquoise cross) - Phase B
- PDF caching strategy - revisit if generation becomes slow at scale
- Multi-language descriptions - out of scope
- Per-portal "allow_email_pdf" toggle - can be added later if needed
- Track last_emailed_at on assignment for "Resend - last sent X days ago" UI - deferred

## Update log

| Date       | Change |
|------------|--------|
| 2026-06-28 | Tracker created. v7.4 broken into 5 patches. |
| 2026-06-29 | All 5 patches built and shipped same day. v7.4 series complete. |
