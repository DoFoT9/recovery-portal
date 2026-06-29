import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import { getDb } from '@/lib/db'
import { videosDir, dataDir } from '@/lib/paths'
import { log } from '@/lib/log'

/**
 * Loads captured frames as base64 data URIs for inlining into the PDF.
 *
 * v7.4.1 stored file_path relative to dataDir(), e.g.
 *   "videos/{video_id}/frames/{slot}.jpg"
 *
 * We still try a few fallback strategies in case earlier installs used a
 * different convention (absolute path, relative to videosDir(), or just the
 * filename), but the primary resolution path is `dataDir() + storedPath`.
 *
 * Misses are logged at warn level so they're visible in journalctl without
 * spamming the log on every successful render.
 */

function resolveFramePath(videoId: string, slot: number, storedPath: string): string | null {
  const candidates: string[] = []

  if (path.isAbsolute(storedPath)) {
    candidates.push(storedPath)
  } else {
    // Canonical: v7.4.1 stores paths relative to dataDir()
    candidates.push(path.join(dataDir(), storedPath))
    // Fallback for any earlier install that stored relative to videosDir()
    candidates.push(path.join(videosDir(), storedPath))
  }

  // Last-resort canonical layout if file_path is empty / unexpected
  candidates.push(path.join(dataDir(), 'videos', videoId, 'frames', `${slot}.jpg`))

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c
    } catch { /* try next */ }
  }
  return null
}

export function loadFramesForVideos(videoIds: string[]): Map<string, Map<number, string>> {
  const out = new Map<string, Map<number, string>>()
  if (videoIds.length === 0) return out

  const db = getDb()
  const placeholders = videoIds.map(() => '?').join(',')
  const rows = db.prepare(
    `select video_id, slot, file_path from video_frames where video_id in (${placeholders}) order by video_id, slot`
  ).all(...videoIds) as { video_id: string; slot: number; file_path: string }[]

  let loaded = 0
  let missing = 0

  for (const row of rows) {
    const abs = resolveFramePath(row.video_id, row.slot, row.file_path)
    if (!abs) {
      missing++
      log.warn('pdf.frame.notfound', {
        video_id: row.video_id,
        slot: row.slot,
        stored_file_path: row.file_path,
      })
      continue
    }
    try {
      const buf = fs.readFileSync(abs)
      const b64 = buf.toString('base64')
      let m = out.get(row.video_id)
      if (!m) { m = new Map(); out.set(row.video_id, m) }
      m.set(row.slot, `data:image/jpeg;base64,${b64}`)
      loaded++
    } catch (err: any) {
      missing++
      log.warn('pdf.frame.readfail', {
        video_id: row.video_id,
        slot: row.slot,
        path: abs,
        error: err?.message || String(err),
      })
    }
  }

  // Single summary line per PDF render — quiet but useful
  log.info('pdf.frames.summary', {
    requested_videos: videoIds.length,
    rows_in_db: rows.length,
    loaded,
    missing,
  })

  return out
}

/** Kept for backward compat. */
export function loadFramesForVideo(videoId: string): Map<number, string> {
  const all = loadFramesForVideos([videoId])
  return all.get(videoId) || new Map()
}