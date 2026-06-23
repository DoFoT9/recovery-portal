import fs from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { videosDir } from '@/lib/paths'

const allowed = ['status', 'sets', 'reps', 'hold_seconds', 'target_rom_degrees', 'exercise_notes', 'title', 'description'] as const

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json()
  const updates: string[] = []
  const values: any[] = []
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates.push(`${key} = ?`)
      values.push(body[key])
    }
  }
  if (body.status === 'archived') {
    updates.push('archived_at = ?')
    values.push(new Date().toISOString())
  } else if (body.status === 'ready') {
    updates.push('archived_at = ?')
    values.push(null)
  }
  if (!updates.length) return NextResponse.json({ ok: true })
  values.push(id)
  getDb().prepare(`update videos set ${updates.join(', ')} where id = ?`).run(...values)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const db = getDb()
  const v = db.prepare("select * from videos where id=?").get(id) as any
  if (v) {
    try { await fs.unlink(path.join(videosDir(), v.file_path)) } catch {}
    db.prepare("delete from videos where id=?").run(id)
  }
  return NextResponse.json({ ok: true })
}
