# v7.5 - Audio Transcription - Progress Tracker

**Goal:** When a clinician uploads a video, automatically transcribe the spoken audio and pre-fill it as the exercise description. Privacy-first: audio processing stays on the user's server.

**Last updated:** 2026-06-29

## Locked decisions (from kickoff)

| Question | Decision |
|----------|----------|
| Engine | whisper.cpp built from source |
| Default model | base.en (~140 MB) - hardcoded for now |
| Language | English only (no auto-detect) |
| Backfill existing videos | No - forward only |
| Re-transcribe button | One-click with no extra confirm (the "Use as notes" button has the confirm) |
| Concurrency | 1 simultaneous transcription, in-memory queue |
| Background processing | Yes - fire and forget, poll for status |
| Completion notification | Inbox notification (deferred to v7.5.2) |
| Empty audio / no speech | Mark 'ready' with empty text, UI shows friendly message |
| Multilingual | Out of scope for v7.5 |
| Engine bundling | Bundled in Docker image (also documented for bare LXC) |

## Patches

| Patch | Status | Goal |
|-------|--------|------|
| v7.5.1 | In progress | Foundation: schema + transcribe engine + manual trigger + Docker bundling |
| v7.5.2 | Planned | Auto-trigger on upload + inbox notification on completion |
| v7.5.3 | Planned | Privacy callout in Settings + confidence indicator |
| v7.5.4 | Planned | Polish: empty state animations, transcript history (optional) |

## v7.5.1 - Foundation

### Scope
- [x] Migration: 6 new columns on `videos` table (transcript_status / text / started_at / completed_at / error / dismissed_at)
- [x] `lib/transcribe.ts` - in-memory queue (concurrency=1), ffmpeg audio extraction, whisper.cpp invocation, status updates
- [x] `POST /api/admin/videos/[id]/transcribe` - queue a transcription
- [x] `GET /api/admin/videos/[id]/transcribe` - poll status
- [x] `VideoTranscriptSection` component embedded in Exercise notes tab - shows status, has trigger button, has "Use as exercise notes" handoff
- [x] `VideoExerciseNotesForm` upgraded to controlled textarea so the transcript can prefill it without losing in-progress edits
- [x] Dockerfile: build whisper.cpp + download base.en in builder stage, copy binary + model to runtime, add ffmpeg to runtime
- [x] LXC setup instructions in README

### Testable outcome
- After applying + restarting: navigate to admin video edit page, switch to Exercise notes tab
- See "Audio transcription" panel at top with "Not started" badge
- Click "Transcribe audio" - status changes to Queued then Processing
- Within ~30-60s (for a typical 30-60s clinical video): status flips to Ready, transcript text appears
- Click "Use as exercise notes" - textarea is pre-filled with the transcript text
- Edit + click Save - notes are persisted; the transcript stays cached
- Click "Re-transcribe" - status flips back to Queued, runs again

### Files changed
- scripts/migrate-v7-5-1.mjs (new)
- scripts/migrate-all.mjs (updated)
- lib/transcribe.ts (new)
- app/api/admin/videos/[id]/transcribe/route.ts (new)
- components/admin/VideoTranscriptSection.tsx (new)
- components/admin/VideoExerciseNotesForm.tsx (rewritten)
- Dockerfile (updated)

## v7.5.2 - Auto-trigger + inbox notification

### Scope (planned)
- [ ] When a new video is uploaded via the existing video upload endpoint, automatically queue transcription
- [ ] When transcription completes, fire an inbox notification (per Q5 decision)
- [ ] Notification shows: video title, programme/stage context, "Review transcript" link to the video edit page
- [ ] If transcript is empty (no speech detected), don't fire notification (would be noisy)
- [ ] Per-portal Setting: "Auto-transcribe new uploads" toggle (default: on if WHISPER_BIN is configured)

## v7.5.3 - Privacy callout + confidence

### Scope (planned)
- [ ] Settings > Privacy section explaining that audio never leaves the server
- [ ] Confidence indicator from whisper's per-segment scores (color-coded)
- [ ] "Low confidence - please verify" warning for transcripts with avg confidence under threshold

## v7.5.4 - Polish

### Scope (planned)
- [ ] Loading skeleton during initial page load instead of "Not started" -> "Pending" flash
- [ ] Empty/no-speech state with helpful illustration
- [ ] Optional: transcript history (keep last N transcripts when re-transcribing)
- [ ] Accessibility audit on the new component
