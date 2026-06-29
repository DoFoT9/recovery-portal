# v7.4.2 — Frame capture UI

Following v7.4.1 (schema + storage API), this patch adds the clinician-facing UI for capturing the 4 frames that will appear in the printable PDF programme (landing in v7.4.3 / v7.4.4).

## What's new

- 🎬 **Dedicated video edit page** at `/admin/videos/[id]/edit` with three tabs: **Details**, **Exercise notes**, **Frames**
- 🎞️ **Frame capture UI**: HTML5 video + custom scrubber + four "Capture for slot N" buttons + 2×2 preview grid that mirrors the PDF layout
- 📸 **Browser-side capture** via `<canvas>.drawImage()` — no FFmpeg required. Exports JPEG at quality 0.85 at the video's native resolution, then POSTs to the v7.4.1 endpoint
- 🧹 **Clear + Recapture** controls per filled slot
- 🪪 **Slot labels** (Top-left, Top-right, Bottom-left, Bottom-right) so clinicians pick frames in the right positional order

## Architecture decision: Option A

We added a new dedicated edit page (rather than expanding the existing inline row editor) because:

1. The progress doc literally says "Frames tab on the admin video edit page (alongside Details / Exercise notes)" — but no such page existed yet
2. A video scrubber + 2×2 thumbnail grid doesn't fit cleanly inside a list-row editor
3. The pattern is already proven elsewhere in the codebase (see `app/(admin)/admin/clients/[id]/ClientTabs.tsx`)
4. Gives v7.4.3+ somewhere to grow (e.g. PDF preview button, "Suggest frames" feature)

The pencil icon on `/admin/videos` now navigates to this new page instead of toggling inline-edit mode.

## Files changed

**New:**
- `app/(admin)/admin/videos/[id]/edit/page.tsx`
- `app/(admin)/admin/videos/[id]/edit/VideoEditTabs.tsx`
- `components/admin/VideoDetailsForm.tsx`
- `components/admin/VideoExerciseNotesForm.tsx`
- `components/admin/VideoFramesTab.tsx`

**Updated:**
- `components/admin/VideoRow.tsx` — pencil icon is now a `<Link>` instead of an `onClick`

**Now orphaned (safe to delete):**
- `components/admin/VideoMetadataEditor.tsx` — no longer referenced anywhere

## Apply

For **npm/source installs**:

```bash
unzip -o recovery-portal-v7-4-2.zip -d .
npm run build
sudo systemctl restart rehab-portal
```

For **Docker installs** (after pushing to GitHub):

```bash
git add "app/(admin)/admin/videos/[id]/edit" components/admin/ V7-4-PROGRESS.md README-v7-4-2.md
git commit -m "Frame capture UI on dedicated video edit page (v7.4.2)"
git tag v7.4.2
git push origin main --tags
```

Then optionally clean up the orphaned editor:

```bash
git rm components/admin/VideoMetadataEditor.tsx
git commit -m "Remove orphaned VideoMetadataEditor (v7.4.2 cleanup)"
```

## How to verify it works

1. **Navigate**: Admin → Videos → click the pencil icon on any video → you should land on `/admin/videos/{id}/edit?tab=details`
2. **Switch tabs**: Click each of **Details**, **Exercise notes**, **Frames** — URL `?tab=` updates without a full reload
3. **Edit details**: Change the title, click Save → toast "Details saved" → URL/page state preserved
4. **Edit notes**: Add some prescription text, save → toast "Notes saved"
5. **Capture frames**:
   - Scrub the video to ~10% in, click "Capture for slot 1" → see toast, slot 1 thumbnail appears, button label flips to "Recapture slot 1"
   - Repeat for slots 2, 3, 4 at different points in the video
   - The "{n} / 4 captured" badge at the top should update
6. **Clear**: Click the red Clear button overlay on a slot → confirm → thumbnail disappears, dashed-border placeholder returns
7. **Recapture**: Scrub to a new point, click the Recapture button on a filled slot → thumbnail updates (cache-busted by version counter)
8. **Refresh the page**: Captured slots persist (loaded from the `video_frames` table on the server)

## Known caveats / notes

- **Safari/iOS**: The capture flow pauses the video before drawing to canvas because Safari sometimes draws stale frames otherwise. Tested in dev — please flag if iPad behaves differently.
- **Canvas tainting**: The video is served from same-origin (`/api/media/videos/{id}`), so we don't need `crossOrigin="anonymous"` and the canvas stays untainted. `toBlob()` works.
- **No native video controls**: We use a custom Play/Pause + scrubber transport rather than `<video controls>`. Avoids double-scrubber UX. If you'd prefer native controls back, easy to flip.
- **`VideoMetadataEditor.tsx`** is now orphaned. The bundle leaves it on disk (we can't delete files via unzip). Remove with `git rm` after you've smoke-tested the new flow.
- **Vertical videos**: Aspect ratio is `aspect-video` (16:9) on both the player and the preview grid. Portrait video frames will letterbox. The PDF (v7.4.4) will handle this properly with `object-fit: contain`.

## What's next

**v7.4.3** — Playwright + basic PDF endpoint. Adds the Playwright dependency, sets up Chromium in the Docker image, creates `/api/admin/assignments/[id]/programme.pdf` returning a text-only PDF. Once that's working we'll layer the 2×2 frame grid in v7.4.4.

Say the word and I'll start on v7.4.3. 🚀
