# v7.4.3 — Playwright + basic PDF endpoint

The HTML-to-PDF pipeline is now live. This patch gets the structure + pagination + footer working with a text-only template. v7.4.4 then layers the captured frames + brand styling on top.

## What's new

- 📄 **`GET /api/admin/assignments/[id]/programme.pdf`** returns a real PDF
- 🧭 **Header** with clinic name + programme title
- 🦶 **Footer** with clinic name, printed date, and `Page X of Y` via Playwright's footer template
- 🧱 **Page-break-safe exercise blocks** (`page-break-inside: avoid`) so exercises never split across pages
- 🖼️ **Placeholder 2×2 frame grid** that v7.4.4 will fill with the real captured frames
- 🐳 **Docker image switched to `node:24-bookworm-slim`** because Chromium on Alpine is a maintenance nightmare. Entrypoint swapped `su-exec` for `gosu`.
- 🔘 **`<ProgrammePdfButton />`** — a button you can drop into the admin assignment view to trigger generation

## Heads up: this patch is NOT auto-wired

I deliberately didn't wire the button into any page because there are two reasonable spots for it (admin assignment view, client detail page Conversations/Assignments) and you know the IA best. Drop this import where it makes sense:

```tsx
import { ProgrammePdfButton } from '@/components/admin/ProgrammePdfButton'

// inside the admin view of an assignment:
{user.role === 'admin' && <ProgrammePdfButton assignmentId={assignment.id} />}
```

Most likely target: somewhere near the Mark Complete button on `app/(client)/assignment/[id]/page.tsx` (admins can already view that page).

## Files added/changed

**New:**
- `lib/pdf/render.ts` — cached Playwright browser, returns PDF buffer
- `lib/pdf/templates/programme.ts` — HTML template + footer template
- `lib/pdf/build-context.ts` — DB → ProgrammeContext, resolves per-assignment overrides
- `app/api/admin/assignments/[id]/programme.pdf/route.ts` — the endpoint
- `components/admin/ProgrammePdfButton.tsx` — provisional download button

**Updated:**
- `Dockerfile` — runtime stage switched to debian-slim, Chromium + system deps installed
- `docker-entrypoint.sh` — `su-exec` → `gosu`

## Apply

### Install Playwright locally first

```bash
npm install playwright
npx playwright install chromium
```

The first command adds it to `package.json`. The second downloads the Chromium binary (~170 MB) into your local Playwright cache. You only need to do this once per machine.

### Drop in the patch

For **npm/source installs**:
```bash
unzip -o recovery-portal-v7-4-3.zip -d .
npm run build
sudo systemctl restart rehab-portal
```

For **Docker installs** (after pushing to GitHub):
```bash
git add lib/pdf app/api/admin/assignments components/admin Dockerfile docker-entrypoint.sh V7-4-PROGRESS.md README-v7-4-3.md package.json package-lock.json
git commit -m "Playwright + basic PDF endpoint (v7.4.3)"
git tag v7.4.3
git push origin main --tags
```

**Note**: rebuilding the Docker image will take longer this time because of the Chromium download and the base image change. Expect ~3–5 minutes vs. the usual ~90 seconds.

## How to verify it works

1. **Local smoke test** before wiring the UI:
   ```bash
   # Get an assignment ID from any client with at least one assignment
   sqlite3 ./data/rehab.db "SELECT id FROM client_assignments LIMIT 1;"
   # Open in browser (logged in as admin so cookie is set):
   # http://localhost:3000/api/admin/assignments/<id>/programme.pdf
   ```
   You should see a basic PDF render in the browser.
2. **Header** shows: clinic name (or portal name fallback) on the left, programme title on the right
3. **Each exercise** has: numbered title, sets/reps/hold formula chip, multi-paragraph description (from `videos.exercise_notes`), and a 2×2 grey placeholder grid where the frames will go in v7.4.4
4. **Footer** shows: `<title> — <clinic> — printed <DD/MM/YYYY>` on the left, `Page N of M` on the right
5. **Long programmes** (10+ exercises) paginate cleanly — no exercise should split across pages
6. **`?download=1`** forces a download instead of inline:
   `http://localhost:3000/api/admin/assignments/<id>/programme.pdf?download=1`

## Known caveats / notes

- **First render after restart is slow** (~1–2s) because Playwright launches Chromium. Subsequent renders reuse the cached browser and are ~200–400ms.
- **Docker image grew ~250 MB** (debian-slim base + Chromium). Worth it for the design iteration speed in v7.4.4.
- **`--no-sandbox`** is required when running Chromium in Docker. We already drop root in the entrypoint so this is acceptable.
- **No PDF caching yet** — content can change at any time (assignments, frames, branding). v7.4.5 may add file-based caching keyed on `assignment_id + updated_at` if generation becomes slow.
- **Network access** from inside Playwright is unrestricted. Since we only `setContent` with already-built HTML (no fetches), this is fine.

## Vertical / portrait videos

The placeholder grid currently uses `aspect-ratio: 1 / 1` cells. v7.4.4 will use `object-fit: contain` with a light grey background so portrait frames letterbox cleanly inside the square cells (matches the QLD sample's behaviour).

## What's next

**v7.4.4** — Full PDF layout matching QLD sample. We swap the placeholder grid for real captured frames (loaded from disk and inlined as base64 data URIs), add the brand colour accents (numbered title underline, header logo), and tighten the typography to match the reference PDF. This is mostly CSS — the wiring is already done in this patch.

Say the word and I'll start on v7.4.4. 🎨
