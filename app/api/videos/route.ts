import path from 'path'
import fs from 'fs/promises'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb, id } from '@/lib/db'
import { videosDir } from '@/lib/paths'

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

export async function POST(req: Request) {
  const user = await requireAdmin()
  const form = await req.formData()
  const file = form.get('file') as File | null
  const title = String(form.get('title') || '').trim()
  const description = String(form.get('description') || '')
  const targetType = String(form.get('target_type') || '')
  const targetId = String(form.get('target_id') || '')

  if (!file || !title) return NextResponse.json({ error: 'file and title required' }, { status: 400 })
  if (!['stage', 'rehab_type'].includes(targetType)) {
    return NextResponse.json({ error: 'target_type must be stage or rehab_type' }, { status: 400 })
  }
  if (!targetId) return NextResponse.json({ error: 'target_id required' }, { status: 400 })

  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
  const year = String(new Date().getFullYear())
  const fileName = `${id()}.${ext}`
  const rel = path.join(year, fileName)
  const abs = path.join(videosDir(), rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()))

  const vid = id()
  const stageId = targetType === 'stage' ? targetId : null
  const rehabTypeId = targetType === 'rehab_type' ? targetId : null

  const sets               = parseIntOrNull(form.get('sets'))
  const reps               = parseIntOrNull(form.get('reps'))
  const hold_seconds       = parseIntOrNull(form.get('hold_seconds'))
  const target_rom_degrees = parseFloatOrNull(form.get('target_rom_degrees'))
  const exerciseNotes      = (form.get('exercise_notes') ? String(form.get('exercise_notes')) : null) || null

  getDb().prepare(`
    insert into videos
      (id, title, description, rehab_type_id, stage_id, file_path, original_name,
       mime_type, size_bytes, sets, reps, hold_seconds, target_rom_degrees,
       exercise_notes, created_by)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    vid, title, description || null, rehabTypeId, stageId, rel, file.name,
    file.type, file.size, sets, reps, hold_seconds, target_rom_degrees,
    exerciseNotes, user.id
  )

  return NextResponse.json({ id: vid })
}
