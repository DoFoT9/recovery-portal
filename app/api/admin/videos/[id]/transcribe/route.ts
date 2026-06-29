import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { queueTranscription, isTranscriptionConfigured, getTranscriptionPaths } from '@/lib/transcribe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  if (!isTranscriptionConfigured()) {
    const paths = getTranscriptionPaths()
    return NextResponse.json({
      error: 'Transcription is not configured on this server. See README-v7-5-1.md for setup.',
      paths,
    }, { status: 503 })
  }

  const db = getDb()
  const video = db.prepare("select id from videos where id = ?").get(id) as any
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  const result = queueTranscription(id)
  if (!result.queued) {
    return NextResponse.json({ error: result.reason || 'Could not queue' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, status: 'queued' })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const db = getDb()
  const row = db.prepare(`
    select transcript_status, transcript_text, transcript_error,
           transcript_started_at, transcript_completed_at
    from videos where id = ?
  `).get(id) as any
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}
