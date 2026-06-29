# v7.4 — PDF Programme Generator — Progress Tracker

**Living document.** Update this file as each patch is committed.
Drop at project root so it's visible alongside ROADMAP-v7.md.

**Current focus:** v7.4.2 — Frame capture UI 🟡

**Goal:** Generate a printable, branded PDF of each client's exercise programme with 4 photo snippets per video manually captured by the clinician via a scrubber UI. Matches the QLD reference sample.

**Last updated:** 2026-06-29

## 📊 Overall progress

`[██░░░░░░░░] 1 / 5 patches shipped`

| Patch  | Status            | Size       | Goal                              |
|--------|-------------------|------------|-----------------------------------|
| v7.4.1 | ✅ Shipped        | ~15–20 KB  | Schema + frame storage API        |
| v7.4.2 | 🟡 In progress    | ~25–30 KB  | Frame capture UI (video scrubber) |
| v7.4.3 | 🔘 Planned        | ~20–25 KB  | Playwright + basic PDF endpoint   |
| v7.4.4 | 🔘 Planned        | ~25–30 KB  | Full PDF layout matching QLD sample |
| v7.4.5 | 🔘 Planned        | ~15–20 KB  | Polish + email delivery           |

**Status legend:** 🔘 Planned · 🟡 In progress · ✅ Shipped

## 🏛️ Architecture decisions

| Decision | Why |
|----------|-----|
| **Browser-side frame capture via `<canvas>`** | No server-side FFmpeg needed for v7.4. Clinician picks the exact moment that best shows the exercise — far better UX than auto-extraction. |
| **Playwright (HTML→PDF) over pdfkit** | Faster design iteration using existing CSS skills. Pixel-perfect match with the QLD sample. ~80 MB image bloat acceptable. |
| **4 manually-captured slots per video** | Matches the 2×2 grid in the sample. Slots are positional (slot 1 = top-left, slot 2 = top-right, etc). |
| **Storage: `DATA_DIR/videos/{video_id}/frames/{slot}.jpg`** | Consistent with v7.2.6 pattern of honouring DATA_DIR. Slot is the only key; new capture overwrites old. |
| **New table `video_frames`** | Tracks video_id, slot (1–4), file_path, captured_at, captured_by. UNIQUE on (video_id, slot). |
| **PDF layout matches the QLD reference** | 2×2 photo grid on left, numbered title + description on right, sets/reps/hold formula top-right, branded header + footer. |
| **Programme title source:** `rehab_type.name` with optional `assignment.programme_title` override (v7.4.5) | Lets clinicians customise per client without editing the rehab type globally. |
| **No auto-extraction in v7.4** | Manual scrubber-based capture only. Auto-extraction can be added in v7.4.6+ if requested. |
| **Dedicated edit page for videos** (added 2026-06-29 for v7.4.2) | New route at `/admin/videos/[id]/edit` with tabs (Details / Exercise notes / Frames). The previous inline-edit row pattern (`VideoMetadataEditor.tsx`) is now orphaned — safe to delete. |

## 📐 Design reference

Layout follows the uploaded `stretching.pdf` sample (the "QLD Core & pelvis & Hips program"):

```
┌──────────────────────────────────────────────────────────┐
│ [QLD]            Core & pelvis & Hips program           │ ← Header
├──────────────────────────────────────────────────────────┤
│                                  1 Set / 3 Reps / 30s   │ ← Formula (right-aligned)
│ ┌─────┬─────┐                                           │
│ │frame│frame│  **1. SLR (legs straight)**               │ ← Numbered title (bold)
│ │  1  │  2  │                                           │
│ ├─────┼─────┤  Lie on your back. Tighten your thigh     │ ← Description (multi-line)
│ │frame│frame│  muscle, pressing the back of your knee   │
│ │  3  │  4  │  into the bed. Keeping your knee locked   │
│ └─────┴─────┘  straight, lift your leg off the bed...   │
├────────────────────────────────────────────────────────────┤
│ [Next exercise block — same layout]                     │
├──────────────────────────────────────────────────────────┤
│ Core & pelvis & Hips program — printed on 28/06/2026    │ ← Footer
│                                              Page 1 of 1│
└──────────────────────────────────────────────────────────┘
```

**Page density:** ~4 exercises per A4 page. Natural pagination via CSS `page-break-inside: avoid`.

## 📦 Patch breakdown

### v7.4.1 — Schema + frame storage ✅
*Shipped 2026-06-29 (manual inline paste due to python_execution tool errors).*

#### Scope
- [x] `scripts/migrate-v7-4.mjs` creates `video_frames` table
- [x] `scripts/init-db.mjs` updated to include `video_frames` (complete schema pattern)
- [x] `scripts/migrate-all.mjs` includes the new migration
- [x] `lib/video-frames.ts` — server-only helpers (getFramePath, frameExists, validation)
- [x] `app/api/admin/videos/[id]/frames/[slot]/route.ts` — handles GET / POST / DELETE
- [x] File storage at `DATA_DIR/videos/{video_id}/frames/{slot}.jpg`
- [x] Slot must be 1–4; reject anything else with 400
- [x] Max file size 2 MB per frame
- [x] Only `image/jpeg` accepted

### v7.4.2 — Frame capture UI 🟡
*Target size: 25–30 KB*

#### Scope
- [x] New "Frames" tab on the **dedicated** admin video edit page (alongside Details / Exercise notes)
- [x] New route `/admin/videos/[id]/edit` (Option A — see architecture decision above)
- [x] HTML5 `<video>` element (custom transport, no native controls to avoid double-scrubber UX)
- [x] Custom scrubber: `<input type="range">` bound to `video.currentTime`
- [x] Display: MM:SS / MM:SS time indicator
- [x] Four labelled buttons: "Capture for slot 1" through "Capture for slot 4"
- [x] Each button captures current frame via `<canvas>.drawImage(video)`, exports JPEG blob (quality 0.85), uploads to v7.4.1 endpoint
- [x] Live 2×2 preview grid of all 4 captured frames (mirrors PDF layout)
- [x] "Clear" button per filled slot
- [x] "Recapture" button per filled slot (visually scrub + capture again)
- [x] Empty slots show dashed border + "Scrub the video, then click Capture for slot N"
- [x] Toast notifications (success/error) via sonner
- [x] Disable capture buttons until video is loaded + has duration
- [x] Slot positions shown visually (top-left, top-right, etc.) so clinician picks frames in order

#### Files changed
- `app/(admin)/admin/videos/[id]/edit/page.tsx` (new)
- `app/(admin)/admin/videos/[id]/edit/VideoEditTabs.tsx` (new)
- `components/admin/VideoDetailsForm.tsx` (new — extracted from old VideoMetadataEditor)
- `components/admin/VideoExerciseNotesForm.tsx` (new — extracted from old VideoMetadataEditor)
- `components/admin/VideoFramesTab.tsx` (new)
- `components/admin/VideoRow.tsx` (updated — pencil now navigates instead of toggling inline edit)
- `components/admin/VideoMetadataEditor.tsx` (orphaned — safe to delete after testing)

#### Testable outcome
- Upload a video via the existing flow
- Navigate to **Videos** → click pencil icon → lands on `/admin/videos/{id}/edit?tab=details`
- Switch to **Frames** tab
- Scrub to interesting moments, click Capture for each slot
- See 4 thumbnails populate in the 2×2 preview grid
- Click Clear on one, click Recapture on another — works as expected

#### Notes
- Canvas frame size = video's native resolution (don't downscale — PDF wants quality)
- JPEG quality 0.85 keeps files small but visually sharp
- Cache-busted thumbnail URLs (`?v=<counter>`) so re-captures refresh the `<img>` immediately
- Safari-friendly: pauses video before drawing to canvas for stable frame
- Same-origin video, so no canvas tainting — no need for `crossOrigin="anonymous"`

### v7.4.3 — Playwright + basic PDF endpoint 🔘
*Target size: 20–25 KB*

#### Scope
- [ ] Add `playwright` to package.json dependencies (~3 MB npm)
- [ ] Dockerfile: install Chromium browser + system deps (~80 MB image bloat)
- [ ] `lib/pdf/render.ts` — server-only Playwright wrapper that takes HTML and returns PDF buffer
- [ ] `lib/pdf/templates/programme.ts` — initial HTML template (text-only, no photos yet)
- [ ] `GET /api/admin/assignments/[id]/programme.pdf` endpoint
- [ ] Returns `application/pdf` with `Content-Disposition: inline`
- [ ] Header: clinic name from v7.0 branding
- [ ] Body: numbered exercise list with title + sets/reps/hold + description from `exercise_notes`
- [ ] Footer: clinic name + printed date
- [ ] Provisional "Download programme PDF" button on assignment view

### v7.4.4 — Full PDF layout matching QLD sample 🔘
*Target size: 25–30 KB*

#### Scope
- [ ] HTML template gets 2×2 photo grid using v7.4.1 frame URLs
- [ ] Embed frames as base64 data URIs (self-contained PDFs, no broken links)
- [ ] Numbered exercise titles (bold, sans-serif, ~14pt)
- [ ] Sets/Reps/Hold formula right-aligned at top of each block
- [ ] Branded header: clinic logo (v7.0) + clinic name + programme title centered
- [ ] Branded footer: clinic name + ABN + printed date + page X of Y
- [ ] Brand colour from v7.0 used for accents (numbered title underline, separators)
- [ ] CSS `page-break-inside: avoid` on exercise blocks
- [ ] Vertical video aspect handled: `object-fit: contain` with light grey background
- [ ] Missing frames: placeholder light-grey box with "No frame captured for slot N"
- [ ] Description text wraps cleanly, supports multi-paragraph

### v7.4.5 — Polish + UX 🔘
*Target size: 15–20 KB*

#### Scope
- [ ] Loading spinner on PDF download button while generating
- [ ] Error toast if generation fails
- [ ] Filename pattern: `{client_name}-{programme_title}-{YYYY-MM-DD}.pdf`
- [ ] Schema: `ALTER TABLE client_assignments ADD COLUMN programme_title TEXT NULL` (idempotent migration)
- [ ] If `programme_title` is set, use it; otherwise `rehab_type.name`
- [ ] UI: optional programme title input on assignment edit
- [ ] "Email programme as PDF" button — uses v7.3 `sendBrandedEmail`
- [ ] New email template `programme-pdf` (template ID + variables)
- [ ] Attachment: the generated PDF as `application/pdf`
- [ ] Email config toggle: "Allow emailing programme PDFs" (default on)

## ✅ Post-release validation checklist

Once all 5 patches are shipped, run through this end-to-end:
- [ ] Fresh Docker install completes setup + creates schema with `video_frames` table
- [ ] Existing install upgrades cleanly (idempotent migration)
- [ ] Upload a new video → navigate to Frames tab → all 4 buttons functional
- [ ] Scrub + capture 4 frames → thumbnails appear immediately
- [ ] Generate PDF → visually matches QLD sample
- [ ] Edit assignment → regenerate PDF → updated content
- [ ] Email PDF to a test address → arrives with correct attachment
- [ ] Test on iPad (PWA install) — PDFs viewable inline
- [ ] Test with vertical videos
- [ ] Test programme with >10 exercises for pagination
- [ ] No regressions in existing video upload / playback flows
- [ ] No regressions in v7.3 email flows

## ❓ Open questions (parking lot)

- [ ] Should we add a "Suggest frames" button that uses FFmpeg to pre-populate slots at 10/35/65/90% as a starting point that the clinician can refine? (Defer to v7.4.6 if requested)
- [ ] Watermark overlay on extracted frames (like the QLD turquoise cross)? Defer to Phase B.
- [ ] Caching strategy for generated PDFs — file-based in `DATA_DIR/pdfs/{assignment_id}-{updated_at}.pdf`? Add in v7.4.5 if generation becomes slow.
- [ ] Multi-language descriptions? Out of scope for v7.4.

## 🔗 Related documents

- `ROADMAP-v7.md` — overall v7 roadmap
- `README-v7-3-1.md` — prior shipped patch (email infrastructure fix)
- `README-v7-4-2.md` — this patch (Frame capture UI)
- `stretching.pdf` — design reference (QLD Core & pelvis & Hips program)

## 📝 Update log

| Date       | Change                                                                                                            |
|------------|-------------------------------------------------------------------------------------------------------------------|
| 2026-06-28 | Tracker created. v7.4 broken into 5 patches. Architecture decisions locked.                                       |
| 2026-06-29 | v7.4.1 shipped manually (inline paste due to python_execution errors). v7.4.2 patch built — Option A: new dedicated edit page with Details / Exercise notes / Frames tabs. |
