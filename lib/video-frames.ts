import 'server-only'
import path from 'node:path'
import fs from 'node:fs'
import { getDb } from '@/lib/db'

export const MAX_SLOTS = 4
export const MAX_FRAME_BYTES = 2 * 1024 * 1024

export function validateSlot(input: number | string): number {
  const n = typeof input === 'string' ? parseInt(input, 10) : input
  if (!Number.isInteger(n) || n < 1 || n > MAX_SLOTS) {
    throw new Error(`Slot must be 1, 2, 3, or 4 (got ${input})`)
  }
  return n
}

export function getDataDir(): string {
  return process.env.DATA_DIR || path.resolve(process.cwd(), 'data')
}

export function getFrameDir(videoId: string): string {
  const dir = path.join(getDataDir(), 'videos', videoId, 'frames')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getFramePath(videoId: string, slot: number): string {
  return path.join(getFrameDir(videoId), `${slot}.jpg`)
}

export function getRelativeFramePath(videoId: string, slot: number): string {
  return path.posix.join('videos', videoId, 'frames', `${slot}.jpg`)
}

export function frameExists(videoId: string, slot: number): boolean {
  const row = getDb()
    .prepare('SELECT 1 FROM video_frames WHERE video_id = ? AND slot = ?')
    .get(videoId, slot)
  return !!row
}

export function recordFrame(videoId: string, slot: number, capturedBy: string | null): void {
  const rel = getRelativeFramePath(videoId, slot)
  getDb()
    .prepare(`
      INSERT INTO video_frames (video_id, slot, file_path, captured_at, captured_by)
      VALUES (?, ?, ?, datetime('now'), ?)
      ON CONFLICT(video_id, slot) DO UPDATE SET
        file_path = excluded.file_path,
        captured_at = excluded.captured_at,
        captured_by = excluded.captured_by
    `)
    .run(videoId, slot, rel, capturedBy)
}

export function deleteFrame(videoId: string, slot: number): void {
  const filePath = getFramePath(videoId, slot)
  try { fs.unlinkSync(filePath) } catch { /* OK if missing */ }
  getDb()
    .prepare('DELETE FROM video_frames WHERE video_id = ? AND slot = ?')
    .run(videoId, slot)
}

export interface FrameMeta {
  slot: number
  captured_at: string
  captured_by: string | null
}

export function listFrames(videoId: string): FrameMeta[] {
  return getDb()
    .prepare('SELECT slot, captured_at, captured_by FROM video_frames WHERE video_id = ? ORDER BY slot')
    .all(videoId) as FrameMeta[]
}
