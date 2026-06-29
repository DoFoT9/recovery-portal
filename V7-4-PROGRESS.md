# v7.4 — PDF Programme Generator — Progress Tracker

**Living document.** Update this file as each patch is committed.
Drop at project root so it's visible alongside ROADMAP-v7.md.

**Current focus:** v7.4.3 — Playwright + basic PDF endpoint 🟡

**Goal:** Generate a printable, branded PDF of each client's exercise programme with 4 photo snippets per video manually captured by the clinician via a scrubber UI. Matches the QLD reference sample.

**Last updated:** 2026-06-29

## 📊 Overall progress

`[████░░░░░░] 2 / 5 patches shipped`

| Patch  | Status            | Size       | Goal                              |
|--------|-------------------|------------|-----------------------------------|
| v7.4.1 | ✅ Shipped        | ~15–20 KB  | Schema + frame storage API        |
| v7.4.2 | ✅ Shipped        | ~25–30 KB  | Frame capture UI (video scrubber) |
| v7.4.3 | 🟡 In progress    | ~20–25 KB  | Playwright + basic PDF endpoint   |
| v7.4.4 | 🔘 Planned        | ~25–30 KB  | Full PDF layout matching QLD sample |
| v7.4.5 | 🔘 Planned        | ~15–20 KB  | Polish + email delivery           |

**Status legend:** 🔘 Planned · 🟡 In progress · ✅ Shipped

## 🏛️ Architecture decisions

| Decision | Why |
|----------|-----|
| **Browser-side frame capture via `<canvas>`** | No server-side FFmpeg needed for v7.4. Clinician picks the exact moment that best shows the exercise — far better UX than auto-extraction. |
| **Playwright (HTML→PDF) over pdfkit** | Faster design iteration using existing CSS skills. Pixel-perfect match with the QLD sample. ~80 MB image bloat acceptable. |
| **4 manually-captured slots per video** | Matches the 2×2 grid in the sample. Slots are positional (slot 1 = top-left, slot 2 = top-right, etc). |
| **Storage: `DATA_DIR/videos/{video_id}/frames/{slot}.jpg`** | Consistent with v7.2.6 pattern of honouring DATA_DIR. |
| **New table `video_frames`** | Tracks video_id, slot (1–4), file_path, captured_at, captured_by. UNIQUE on (video_id, slot). |
| **PDF layout matches the QLD reference** | 2×2 photo grid on left, numbered title + description on right, sets/reps/hold formula top-right, branded header + footer. |
| **Programme title source:** `rehab_type.name` with optional `assignment.programme_title` override (v7.4.5) | Lets clinicians customise per client without editing the rehab type globally. |
| **Dedicated edit page for videos (v7.4.2)** | New route at `/admin/videos/[id]/edit` with tabs (Details / Exercise notes / Frames). |
| **Debian-slim base image for runtime (v7.4.3)** | Chromium on Alpine is unmaintained; switched runner stage to `node:24-bookworm-slim` + `gosu` instead of `su-exec`. ~80 MB image growth, acceptable per locked decision. |
| **Cached single Chromium browser instance (v7.4.3)** | One launch per Node process, fresh context+page per render. Plenty for low volume; pool can come later if needed. |
| **Chromium-only Playwright install (v7.4.3)** | `playwright install chromium` skips Firefox + Webkit, saves ~300 MB. |

## 📐 Design reference

(unchanged — see previous version for the QLD layout ASCII diagram)

## 📦 Patch breakdown

### v7.4.1 — Schema + frame storage ✅
*Shipped 2026-06-29 (manual inline paste).*

### v7.4.2 — Frame capture UI ✅
*Shipped 2026-06-29.*

Files:
- `app/(admin)/admin/videos/[id]/edit/page.tsx`
- `app/(admin)/admin/videos/[id]/edit/VideoEditTabs.tsx`
- `components/admin/VideoDetailsForm.tsx`
- `components/admin/VideoExerciseNotesForm.tsx`
- `components/admin/VideoFramesTab.tsx`
- `components/admin/VideoRow.tsx`
- `components/admin/VideoMetadataEditor.tsx` — orphaned, safe to delete

### v7.4.3 — Playwright + basic PDF endpoint 🟡
*Target size: 20–25 KB (excluding Docker image growth).*

#### Scope
- [x] Add `playwright` to package.json (instruction: `npm install playwright`)
- [x] Dockerfile: switch runtime to `node:24-bookworm-slim`, install Chromium system deps + Chromium browser via `playwright install chromium`
- [x] Entrypoint: swap `su-exec` for `gosu` (debian equivalent)
- [x] `lib/pdf/render.ts` — cached-browser Playwright wrapper, returns PDF buffer
- [x] `lib/pdf/templates/programme.ts` — initial HTML template (text-only, placeholder grey 2×2 grid for now)
- [x] `lib/pdf/build-context.ts` — DB → ProgrammeContext, resolves overrides
- [x] `GET /api/admin/assignments/[id]/programme.pdf` endpoint
- [x] Returns `application/pdf` with `Content-Disposition: inline` (or attachment via `?download=1`)
- [x] Header: clinic name + programme title
- [x] Body: numbered exercise list with title + sets/reps/hold + description from `exercise_notes`
- [x] Footer: clinic name + printed date + page X of Y (Playwright footer template)
- [x] `components/admin/ProgrammePdfButton.tsx` for the assignment view

#### Wiring it in
The button isn't auto-wired into any page in this patch — drop the import into `app/(client)/assignment/[id]/page.tsx` (or wherever the admin views assignments) when you're ready to expose it. Example:

```tsx
import { ProgrammePdfButton } from '@/components/admin/ProgrammePdfButton'
// ...inside the admin view of an assignment:
{user.role === 'admin' && <ProgrammePdfButton assignmentId={assignment.id} />}
```

We deliberately left wiring to you because there are two reasonable places it could go (admin assignment view, client detail page Assignments tab) and you know the IA best.

#### Testable outcome
- `npm install playwright` succeeds locally
- `npx playwright install chromium` downloads ~170 MB Chromium binary
- Drop the button somewhere admin-visible
- Click → new browser tab opens with a basic PDF containing all exercises in the assignment
- Header shows clinic name + programme title; footer shows page numbers
- The 4 grey "No frame yet" placeholder boxes are where v7.4.4 will inject the captured frames
- No photos yet — that's v7.4.4

#### Notes
- Playwright launches a single Chromium instance per Node process and reuses it. First render is slow (~1–2s), subsequent renders are fast (~200–400ms)
- `setContent` waits for `networkidle` so inline base64 images (v7.4.4) will render before we snapshot
- `--no-sandbox` is required in Docker; we already drop root in the entrypoint so this is acceptable
- The Docker image grows ~80 MB from the base change + ~170 MB from Chromium = ~250 MB total. Worth it for design iteration speed.
- We don't cache generated PDFs — assignments and frames change too often. v7.4.5 may add file-based caching if generation becomes a bottleneck.

### v7.4.4 — Full PDF layout matching QLD sample 🔘
(unchanged from previous)

### v7.4.5 — Polish + UX 🔘
(unchanged from previous)

## ✅ Post-release validation checklist
(unchanged from previous)

## ❓ Open questions (parking lot)
- [ ] "Suggest frames" auto-extraction at 10/35/65/90% — defer to v7.4.6
- [ ] Watermark overlay on frames — defer to Phase B
- [ ] PDF caching strategy — revisit in v7.4.5 if needed
- [ ] Multi-language descriptions — out of scope for v7.4
- [x] **Where does the Download button live?** — left unwired in v7.4.3, drop into admin assignment view manually

## 🔗 Related documents
- `ROADMAP-v7.md` — overall v7 roadmap
- `README-v7-3-1.md` — email infrastructure fix
- `README-v7-4-2.md` — frame capture UI
- `README-v7-4-3.md` — this patch (Playwright + basic PDF)
- `stretching.pdf` — design reference

## 📝 Update log

| Date       | Change                                                                                                            |
|------------|-------------------------------------------------------------------------------------------------------------------|
| 2026-06-28 | Tracker created. v7.4 broken into 5 patches. Architecture decisions locked.                                       |
| 2026-06-29 | v7.4.1 shipped manually. v7.4.2 patch built — Option A: dedicated edit page with tabs. v7.4.2 confirmed working. v7.4.3 patch built — Playwright + basic PDF endpoint, switched Docker base to debian-slim. |
