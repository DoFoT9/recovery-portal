import path from 'path'
import fs from 'fs'
import { mkdir } from 'fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import Busboy from 'busboy'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb, id } from '@/lib/db'
import { videosDir } from '@/lib/paths'

export const runtime = 'nodejs'
export const maxDuration = 600  // 10 min for big uploads on slow connections
export const dynamic = 'force-dynamic'

function parseIntOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = parseInt(String(v), 10)
  return isNaN(n) ? null : n
}
function parseFloatOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(String(v))
  return isNaN(n) ? null : n
}

interface UploadedFile {
  originalName: string
  mimeType: string
  absPath: string
  relPath: string
  bytes: number
}

interface ParsedMultipart {
  fields: Record<string, string>
  file: UploadedFile | null
}

/**
 * Streams a multipart/form-data request body to disk using busboy.
 * Replaces req.formData() to avoid Next.js App Router's hardcoded 10MB
 * body buffer limit. Memory usage stays constant regardless of file size.
 */
async function streamMultipart(req: Request): Promise<ParsedMultipart> {
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.startsWith('multipart/form-data')) {
    throw new Error('Content-Type must be multipart/form-data')
  }
  if (!req.body) {
    throw new Error('Request has no body')
  }

  return new Promise<ParsedMultipart>((resolve, reject) => {
    const fields: Record<string, string> = {}
    let uploadedFile: UploadedFile | null = null
    let fileError: Error | null = null
    const pendingWrites: Promise<void>[] = []

    const busboy = Busboy({
      headers: { 'content-type': contentType },
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5 GB safety cap
        files: 1,
        fields: 50,
      },
    })

    busboy.on('field', (name, value) => {
      fields[name] = value
    })

    busboy.on('file', (_name, fileStream, info) => {
      const writePromise = (async () => {
        const safeName = info.filename || 'upload'
        const ext = (safeName.split('.').pop() || 'mp4').toLowerCase()
        const year = String(new Date().getFullYear())
        const fileName = `${id()}.${ext}`
        const rel = path.join(year, fileName)
        const abs = path.join(videosDir(), rel)
        await mkdir(path.dirname(abs), { recursive: true })

        let size = 0
        fileStream.on('data', (chunk: Buffer) => { size += chunk.length })

        const writeStream = fs.createWriteStream(abs)
        await pipeline(fileStream, writeStream)

        uploadedFile = {
          originalName: safeName,
          mimeType: info.mimeType || 'application/octet-stream',
          absPath: abs,
          relPath: rel,
          bytes: size,
        }
      })()

      pendingWrites.push(
        writePromise.catch(err => {
          fileError = err
          // Drain the remaining stream so busboy can complete
          fileStream.resume()
        })
      )
    })

    busboy.on('error', err => reject(err))

    busboy.on('close', async () => {
      try {
        await Promise.all(pendingWrites)
        if (fileError) reject(fileError)
        else resolve({ fields, file: uploadedFile })
      } catch (err) {
        reject(err as Error)
      }
    })

    const nodeStream = Readable.fromWeb(req.body as any)
    nodeStream.on('error', err => reject(err))
    nodeStream.pipe(busboy)
  })
}

export async function POST(req: Request) {
  const user = await requireAdmin()

  let parsed: ParsedMultipart
  try {
    parsed = await streamMultipart(req)
  } catch (err: any) {
    return NextResponse.json({ error: `Upload failed: ${err?.message || err}` }, { status: 400 })
  }

  const file = parsed.file
  const title = String(parsed.fields.title || '').trim()
  const description = String(parsed.fields.description || '')
  const targetType = String(parsed.fields.target_type || '')
  const targetId = String(parsed.fields.target_id || '')

  if (!file || !title) {
    return NextResponse.json({ error: 'file and title required' }, { status: 400 })
  }
  if (!['stage', 'rehab_type'].includes(targetType)) {
    return NextResponse.json({ error: 'target_type must be stage or rehab_type' }, { status: 400 })
  }
  if (!targetId) {
    return NextResponse.json({ error: 'target_id required' }, { status: 400 })
  }

  const vid = id()
  const stageId = targetType === 'stage' ? targetId : null
  const rehabTypeId = targetType === 'rehab_type' ? targetId : null

  const sets               = parseIntOrNull(parsed.fields.sets)
  const reps               = parseIntOrNull(parsed.fields.reps)
  const hold_seconds       = parseIntOrNull(parsed.fields.hold_seconds)
  const target_rom_degrees = parseFloatOrNull(parsed.fields.target_rom_degrees)
  const exerciseNotes      = parsed.fields.exercise_notes ? String(parsed.fields.exercise_notes) : null

  getDb().prepare(`
    insert into videos
      (id, title, description, rehab_type_id, stage_id, file_path, original_name,
       mime_type, size_bytes, sets, reps, hold_seconds, target_rom_degrees,
       exercise_notes, created_by)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    vid, title, description || null, rehabTypeId, stageId, file.relPath, file.originalName,
    file.mimeType, file.bytes, sets, reps, hold_seconds, target_rom_degrees,
    exerciseNotes, user.id
  )

  return NextResponse.json({ id: vid })
}