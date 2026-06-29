import 'server-only'
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { getDb } from '@/lib/db'
import { videosDir } from '@/lib/paths'
import { log } from '@/lib/log'

const WHISPER_BIN = process.env.WHISPER_BIN || '/opt/whisper.cpp/build/bin/whisper-cli'
const WHISPER_MODEL = process.env.WHISPER_MODEL || '/opt/whisper.cpp/models/ggml-base.en.bin'
const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg'

// In-memory queue: concurrency = 1 (per v7.5 design decision)
let active = false
const queue: Array<() => Promise<void>> = []

function drain() {
  if (active) return
  const next = queue.shift()
  if (!next) return
  active = true
  next().finally(() => {
    active = false
    drain()
  })
}

export function isTranscriptionConfigured(): boolean {
  return existsSync(WHISPER_BIN) && existsSync(WHISPER_MODEL)
}

export function getTranscriptionPaths() {
  return {
    bin: WHISPER_BIN,
    model: WHISPER_MODEL,
    ffmpeg: FFMPEG_BIN,
    binExists: existsSync(WHISPER_BIN),
    modelExists: existsSync(WHISPER_MODEL),
  }
}

export function queueTranscription(videoId: string): { queued: boolean; reason?: string } {
  const db = getDb()
  const video = db.prepare(
    "select id, file_path, transcript_status from videos where id = ?"
  ).get(videoId) as any

  if (!video) return { queued: false, reason: 'Video not found' }
  if (!video.file_path) return { queued: false, reason: 'Video has no file' }
  if (video.transcript_status === 'pending' || video.transcript_status === 'processing') {
    return { queued: false, reason: 'Already in progress' }
  }

  db.prepare(`
    update videos set
      transcript_status = 'pending',
      transcript_started_at = null,
      transcript_completed_at = null,
      transcript_error = null
    where id = ?
  `).run(videoId)

  queue.push(() => transcribeVideo(videoId, video.file_path))
  log.info('transcribe.queued', { videoId, queueLength: queue.length })
  drain()
  return { queued: true }
}

async function transcribeVideo(videoId: string, filePath: string): Promise<void> {
  const db = getDb()
  const absVideo = path.join(videosDir(), filePath)
  const startedAt = new Date().toISOString()
  db.prepare(
    "update videos set transcript_status = 'processing', transcript_started_at = ? where id = ?"
  ).run(startedAt, videoId)
  log.info('transcribe.start', { videoId, file: absVideo })

  if (!isTranscriptionConfigured()) {
    const msg = `Transcription not configured. WHISPER_BIN=${WHISPER_BIN} (exists: ${existsSync(WHISPER_BIN)}), WHISPER_MODEL=${WHISPER_MODEL} (exists: ${existsSync(WHISPER_MODEL)})`
    db.prepare(
      "update videos set transcript_status = 'failed', transcript_error = ? where id = ?"
    ).run(msg, videoId)
    log.error('transcribe.notconfigured', { videoId })
    return
  }

  const jobId = randomUUID()
  const tmpWav = path.join(tmpdir(), `rp-transcribe-${jobId}.wav`)
  const txtBase = path.join(tmpdir(), `rp-transcribe-${jobId}`)
  const txtPath = `${txtBase}.txt`

  try {
    // 1. Extract audio to 16 kHz mono PCM WAV (whisper.cpp's preferred input)
    await runProcess(FFMPEG_BIN, [
      '-i', absVideo,
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      '-vn',
      '-y',
      tmpWav,
    ], 'ffmpeg', 5 * 60_000)

    // 2. Run whisper.cpp
    //    -l en       English only (per v7.5 design decision)
    //    -otxt       output plain text
    //    -nt         no timestamps inline in text
    //    -of <base>  output base (writes <base>.txt)
    await runProcess(WHISPER_BIN, [
      '-m', WHISPER_MODEL,
      '-f', tmpWav,
      '-l', 'en',
      '-otxt',
      '-nt',
      '-of', txtBase,
    ], 'whisper', 15 * 60_000)

    // 3. Read the transcript
    let transcript = ''
    try {
      transcript = (await fs.readFile(txtPath, 'utf8')).trim()
    } catch {
      transcript = ''
    }

    const completedAt = new Date().toISOString()
    db.prepare(`
      update videos set
        transcript_status = 'ready',
        transcript_text = ?,
        transcript_completed_at = ?,
        transcript_error = null
      where id = ?
    `).run(transcript, completedAt, videoId)

    log.info('transcribe.complete', {
      videoId,
      chars: transcript.length,
      durationMs: Date.parse(completedAt) - Date.parse(startedAt),
      empty: transcript.length === 0,
    })
  } catch (err: any) {
    const msg = err?.message || String(err)
    db.prepare(
      "update videos set transcript_status = 'failed', transcript_error = ? where id = ?"
    ).run(msg.slice(0, 1000), videoId)
    log.error('transcribe.failed', { videoId, error: msg })
  } finally {
    await fs.unlink(tmpWav).catch(() => {})
    await fs.unlink(txtPath).catch(() => {})
  }
}

function runProcess(bin: string, args: string[], label: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`))
    }, timeoutMs)
    child.stdout.on('data', d => { stdout += d.toString() })
    child.stderr.on('data', d => { stderr += d.toString() })
    child.on('error', err => {
      clearTimeout(timer)
      reject(new Error(`${label} spawn failed: ${err.message}`))
    })
    child.on('close', code => {
      clearTimeout(timer)
      if (code === 0) resolve(stdout)
      else reject(new Error(`${label} exited ${code}: ${stderr.slice(0, 500) || '(no stderr)'}`))
    })
  })
}
