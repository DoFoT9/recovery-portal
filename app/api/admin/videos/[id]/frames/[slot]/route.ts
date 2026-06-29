import { NextResponse } from 'next/server'
import { promises as fsp } from 'node:fs'
import { requireAdmin } from '@/lib/auth'
import {
  MAX_FRAME_BYTES,
  validateSlot,
  getFramePath,
  getFrameDir,
  frameExists,
  recordFrame,
  deleteFrame,
} from '@/lib/video-frames'

type Ctx = { params: Promise<{ id: string; slot: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  await requireAdmin()
  const { id, slot: slotStr } = await params
  let slot: number
  try {
    slot = validateSlot(slotStr)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  if (!frameExists(id, slot)) {
    return NextResponse.json({ error: 'Frame not found' }, { status: 404 })
  }
  try {
    const buf = await fsp.readFile(getFramePath(id, slot))
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Frame file missing on disk' }, { status: 404 })
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const admin = await requireAdmin()
  const { id, slot: slotStr } = await params
  let slot: number
  try {
    slot = validateSlot(slotStr)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: 'No file provided (expected multipart field "file")' },
      { status: 400 },
    )
  }
  if (file.type && file.type !== 'image/jpeg') {
    return NextResponse.json(
      { error: `Only image/jpeg accepted (got ${file.type})` },
      { status: 415 },
    )
  }
  if (file.size > MAX_FRAME_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_FRAME_BYTES} bytes)` },
      { status: 413 },
    )
  }

  const buf = Buffer.from(await file.arrayBuffer())
  getFrameDir(id)
  await fsp.writeFile(getFramePath(id, slot), buf)
  recordFrame(id, slot, admin.id)

  return NextResponse.json({ ok: true, video_id: id, slot })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  await requireAdmin()
  const { id, slot: slotStr } = await params
  let slot: number
  try {
    slot = validateSlot(slotStr)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  deleteFrame(id, slot)
  return NextResponse.json({ ok: true, video_id: id, slot })
}