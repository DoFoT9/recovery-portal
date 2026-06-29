# v7.5.1 - Audio transcription foundation

The first patch in the v7.5 series. Adds the database schema, the transcription engine (ffmpeg + whisper.cpp wrapper), a manual trigger endpoint, and a UI panel on the Exercise notes tab. After applying, you can transcribe any uploaded video with a single click.

This patch is the **foundation**. v7.5.2 will auto-trigger transcription when a video is uploaded and add the inbox notification on completion.

## What's new

- A new "Audio transcription" panel on the Exercise notes tab of each video's edit page
- Click "Transcribe audio" - it extracts audio with ffmpeg, runs whisper.cpp with base.en, and saves the result to the DB
- Live status updates via polling: Queued -> Processing -> Ready (or Failed)
- "Use as exercise notes" copies the transcript into the textarea (with a confirm if you'd lose existing text)
- "Re-transcribe" button to run it again if you didn't like the first result
- Whisper.cpp + base.en bundled into the Docker image so deployments are zero-config
- Bare-LXC setup instructions below for non-Docker users

## Privacy positioning

**Audio is processed entirely on your server.** The video file never leaves your network, no external API is called, no cloud service is involved. This is a major differentiator vs SaaS transcription services (AssemblyAI, OpenAI Whisper API, Google STT). Worth shouting about to healthcare/medical clients.

## Setup - LXC / bare metal

If you're running Recovery Portal directly on an LXC or VPS without Docker, you need to install whisper.cpp and ffmpeg yourself. Steps:

### 1. Install system dependencies
```bash
sudo apt update
sudo apt install -y build-essential cmake git ffmpeg
```

### 2. Clone and build whisper.cpp
```bash
sudo mkdir -p /opt/whisper.cpp
sudo chown $USER:$USER /opt/whisper.cpp
cd /opt
git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build with portable flags (works across CPU generations)
cmake -B build -DGGML_NATIVE=OFF -DWHISPER_BUILD_TESTS=OFF
cmake --build build --config Release -j$(nproc)
```

Build takes 1-3 minutes on a modest LXC. Output binary lands at `/opt/whisper.cpp/build/bin/whisper-cli`.

### 3. Download the base.en model (~140 MB)
```bash
cd /opt/whisper.cpp
bash ./models/download-ggml-model.sh base.en
```

### 4. Smoke-test that whisper.cpp works
```bash
cd /opt/whisper.cpp
./build/bin/whisper-cli -m models/ggml-base.en.bin -f samples/jfk.wav
```

You should see the JFK speech transcribed (something like "And so my fellow Americans, ask not what your country..."). If this works, whisper.cpp is correctly installed.

### 5. Tell Recovery Portal where to find the binaries
Append to `/opt/rehab-portal/.env.local`:
```bash
echo "" >> /opt/rehab-portal/.env.local
echo "# v7.5 Audio transcription" >> /opt/rehab-portal/.env.local
echo "WHISPER_BIN=/opt/whisper.cpp/build/bin/whisper-cli" >> /opt/rehab-portal/.env.local
echo "WHISPER_MODEL=/opt/whisper.cpp/models/ggml-base.en.bin" >> /opt/rehab-portal/.env.local
# FFMPEG_BIN defaults to "ffmpeg" (PATH lookup), set explicitly only if it's elsewhere
```

### 6. Apply the patch
```bash
cd /opt/rehab-portal
unzip -o recovery-portal-v7-5-1.zip -d .
node scripts/migrate-v7-5-1.mjs
npm run build
sudo systemctl restart rehab-portal
```

### 7. Verify in the UI
1. Log in as admin
2. Go to Admin -> Videos -> click pencil on any video
3. Switch to Exercise notes tab
4. You should see the "Audio transcription" panel at the top with "Not started" badge
5. Click "Transcribe audio"
6. Status should change to Queued -> Processing -> Ready within ~30-60s

### 8. Watch the journal as it runs
```bash
sudo journalctl -u rehab-portal -f | grep transcribe
```

Expected log output:
```
{"msg":"transcribe.queued","videoId":"abc-123","queueLength":1}
{"msg":"transcribe.start","videoId":"abc-123","file":"/data/videos/2026/xxx.mp4"}
{"msg":"transcribe.complete","videoId":"abc-123","chars":342,"durationMs":28194,"empty":false}
```

If you see `transcribe.notconfigured` instead, double-check the .env.local paths exist and have correct permissions for the systemd user.

## Setup - Docker

If you're running the Docker image, **everything is bundled**. After pulling the new image and restarting:
```bash
docker compose pull
docker compose up -d
```

The whisper binary and base.en model are baked into the image. No additional setup. Verify the same way - admin video edit page -> Exercise notes tab -> click Transcribe audio.

## Files added/changed

**New:**
- `scripts/migrate-v7-5-1.mjs` - adds 6 transcript columns to videos table (idempotent)
- `lib/transcribe.ts` - in-memory queue, ffmpeg + whisper.cpp wrapper, status updates
- `app/api/admin/videos/[id]/transcribe/route.ts` - POST to queue, GET to poll
- `components/admin/VideoTranscriptSection.tsx` - the new UI panel

**Updated:**
- `scripts/migrate-all.mjs` - chain includes v7-5-1
- `components/admin/VideoExerciseNotesForm.tsx` - controlled textarea + embed transcript panel
- `Dockerfile` - builder stage builds whisper.cpp + downloads base.en; runtime adds ffmpeg + copies whisper binary

## Apply (Docker path)

```bash
unzip -o recovery-portal-v7-5-1.zip -d .
git add scripts lib app components Dockerfile V7-5-PROGRESS.md README-v7-5-1.md
git commit -m "v7.5.1: audio transcription foundation (whisper.cpp + manual trigger)"
git tag v7.5.1
git push origin main --tags
```

The CI build will be ~5 minutes longer than usual because whisper.cpp compiles from source + the 140 MB model download. After that, subsequent builds are cached.

## How to verify the build worked

After CI is green:
```bash
docker pull ghcr.io/dofot9/recovery-portal:7.5.1
docker run --rm ghcr.io/dofot9/recovery-portal:7.5.1 ls -la /opt/whisper.cpp/build/bin/whisper-cli /opt/whisper.cpp/models/ggml-base.en.bin
```

You should see both files exist with reasonable sizes (~3 MB binary, ~140 MB model).

## Performance expectations

| Video length | base.en on modest LXC (4 vCPU) |
|--------------|-------------------------------|
| 30 seconds | ~10-15s transcription |
| 60 seconds | ~25-40s transcription |
| 2 minutes | ~60-90s transcription |
| 5 minutes | ~3-4 minutes transcription |

The first transcription after a server restart is slightly slower (~5s extra) because whisper.cpp has to load the 140 MB model into RAM. Subsequent transcriptions reuse the warm model.

RAM usage during transcription: ~250 MB.

## Known caveats

- **base.en is English-only.** If your clinic produces Spanish or French videos, the transcript will be garbage. v7.5.x has no multilingual support per the locked decisions; if you need it later we'll add a per-portal language setting and use the multilingual base model.
- **No auto-trigger on upload yet.** This is v7.5.2. For now, every video needs a manual click on "Transcribe audio".
- **No completion notification yet.** The Inbox notification on completion was promised in your Q5 answer. It lands in v7.5.2 alongside auto-trigger.
- **Concurrency=1 by design.** If you click Transcribe on 10 videos in quick succession, they queue up and run sequentially. Avoids RAM spikes. Not currently visible in the UI (no "Queue: 3 ahead of you" yet) - planned for v7.5.4 polish.
- **Whisper sometimes hallucinates on silent or unclear segments.** This is a known limitation of the model. The "Use as exercise notes" workflow with admin review handles this - we never auto-publish without human confirmation.

## What's next

**v7.5.2** - Auto-trigger on upload + inbox notification on completion. After v7.5.2, the clinician's workflow becomes: upload video -> get a notification minutes later -> review and save the transcript. Pure delight feature.

Say the word and I'll build v7.5.2.
