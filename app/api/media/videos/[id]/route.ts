import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { videosDir } from '@/lib/paths'
import { canUserAccessVideo } from '@/lib/access'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  if (!canUserAccessVideo(user, id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const video = getDb().prepare(
    "select * from videos where id=? and status='ready'"
  ).get(id) as any
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const file = path.join(videosDir(), video.file_path)
  if (!fs.existsSync(file)) return NextResponse.json({ error: 'File missing' }, { status: 404 })

  const stat = fs.statSync(file)
  const range = req.headers.get('range')
  const headers: any = {
    'Content-Type': video.mime_type || 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Content-Length': stat.size,
  }
  if (range) {
    const [startS, endS] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startS, 10)
    const end = endS ? parseInt(endS, 10) : stat.size - 1
    headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`
    headers['Content-Length'] = end - start + 1
    return new Response(fs.createReadStream(file, { start, end }) as any, { status: 206, headers })
  }
  return new Response(fs.createReadStream(file) as any, { headers })
}
