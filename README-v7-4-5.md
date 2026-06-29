# v7.4.5 - Polish + programme title override + email delivery

The final patch in the v7.4 series. Adds the programme title override, sensible download filenames, and the long-awaited "Email programme as PDF" button - with a confirm modal so you don't email the wrong client by accident.

## What's new

### For admins
- **Programme title override** on the assignment detail page. Leave it blank to use the default ({rehab type} - {stage}), or override it with whatever makes sense for that client (e.g. "Knee rehab - week 3")
- **Download programme PDF** button - downloads with a sensible filename: {client_name}-{programme_title}-{YYYY-MM-DD}.pdf
- **Email programme PDF to client** button with a confirm modal showing the client's email address before sending. Uses the v7.3 email infrastructure with a new branded programme-pdf template

### For clients
- **Download programme PDF** button on their own assignment page so they can grab the PDF whenever they like

### Under the hood
- New email template `programme-pdf` with branded HTML body explaining the attachment
- EmailMessage interface extended with optional `attachments[]` field - nodemailer transport now passes them through
- PDF endpoint can be called by either the admin OR the client owner of the assignment (was admin-only in v7.4.3-4)

## Files added/changed

**New:**
- `scripts/migrate-v7-4-5.mjs` - adds programme_title column
- `app/api/admin/assignments/[id]/email-pdf/route.ts` - generates + emails the PDF
- `components/admin/ProgrammeAdminToolbar.tsx` - title override + Download + Email modal
- `components/client/ProgrammePdfDownloadButton.tsx` - simple client download

**Updated:**
- `scripts/migrate-all.mjs` - includes v7-4-5 in the chain
- `lib/email/types.ts` - EmailAttachment + attachments[] on EmailMessage
- `lib/email/adapters/smtp.ts` - pipes attachments through to nodemailer
- `lib/email/adapters/console.ts` - logs attachment metadata
- `lib/email/templates.ts` - new programme-pdf template
- `lib/email/send.ts` - sendBrandedEmail accepts attachments
- `lib/pdf/build-context.ts` - programme_title override + buildPdfFilename helper
- `app/api/admin/assignments/[id]/programme.pdf/route.ts` - improved filename, allows owner client download
- `app/api/assignments/[id]/route.ts` - admin can set programme_title
- `app/(client)/assignment/[id]/page.tsx` - shows toolbar conditionally on user.role

**Safe to delete:**
- `components/admin/ProgrammePdfButton.tsx` - v7.4.3 placeholder, never wired in

## Apply

For npm/source installs:
```bash
unzip -o recovery-portal-v7-4-5.zip -d .
node scripts/migrate-v7-4-5.mjs
npm run build
sudo systemctl restart rehab-portal
```

For Docker installs:
```bash
git add scripts lib app components V7-4-PROGRESS.md README-v7-4-5.md
git rm components/admin/ProgrammePdfButton.tsx
git commit -m "Polish + programme title override + email delivery (v7.4.5)"
git tag v7.4.5
git push origin main --tags
```

No new dependencies - email attachments use the existing nodemailer from v7.3.

## How to verify it works

### Migration
```bash
sqlite3 ./data/rehab.db "PRAGMA table_info(client_assignments)" | grep programme_title
```
You should see one row with the new column.

### Admin flow
1. Log in as admin, navigate to any client's assignment: `/assignment/{id}`
2. You should see a **Programme PDF** card with:
   - Title input (placeholder shows the default like `Knee Surgery - Phase 1: Hydrotherapy`)
   - **Save** button (disabled until you change something)
   - **Download PDF** button
   - **Email PDF to client** button (disabled if client has no email)
3. Type a custom title like `Knee rehab - week 3` and click Save. Toast confirms.
4. Click Download PDF. File downloads as `Jane-Smith-Knee-rehab-week-3-2026-06-29.pdf`
5. Click Email PDF to client. Modal shows `jane@example.com`. Click Send.
6. Toast: "PDF emailed to jane@example.com (NNN KB)"
7. Check journal: `sudo journalctl -u rehab-portal -f | grep email.sent`
   You should see `template:programme-pdf attachments:1`

### Client flow
1. Log in as the client (jane@example.com)
2. Go to their own assignment page
3. See a single **Download programme PDF** button next to Mark Complete - no title override, no email button
4. Click it - PDF downloads with the same filename pattern

### Access control
1. As client A, try to hit a different client's PDF URL - should return 403
2. As any non-admin, try to PATCH a programme_title - should return 403

## Notes / caveats

- **Attachment size limit**: most SMTP providers cap attachments around 25 MB. A 10-exercise programme with all 40 frames at full resolution can hit 5-10 MB, so you're well clear, but very long programmes may bounce. Download button is always the fallback.
- **Email subject is the programme title**, so renaming changes the subject. Previous emails won't thread together if you rename and resend.
- **No "last emailed" tracking** - clicking Email twice sends twice. Could add in v7.4.6 if needed.
- **No portal-wide toggle** to disable emailing PDFs. If you need that, comment out the button or delete the email-pdf route. Easy to add as a branding key later.

## What's next

The v7.4 series is **complete**! 🎉

Possible follow-ups if there's appetite:
- **v7.4.6**: "Suggest frames" using FFmpeg at 10/35/65/90% timestamps
- **v7.5**: per-client custom logos / branding overrides (multi-clinic SaaS direction)
- **v7.6**: PWA offline-first - cache assignments + videos + PDFs locally for gym/pool with no signal
- **v8.0**: rewritten clinician dashboard with smart recommendations

For now: celebrate! 🥳
