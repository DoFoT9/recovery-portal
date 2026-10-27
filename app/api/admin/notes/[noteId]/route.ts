// app/api/admin/notes/[noteId]/route.ts
//
// v7.7 — update / delete a single note. Admin-only.
//   PATCH { title?, body?, pinned? } -> { ok: true }
//   DELETE                            -> { ok: true }

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { updateNote, deleteNote, getNoteClientId } from '@/lib/notes'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  await requireAdmin()
  const { noteId } = await params
  if (!getNoteClientId(noteId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const { title, body, pinned } = await req.json().catch(() => ({}))
  updateNote(noteId, {
    ...(title !== undefined ? { title } : {}),
    ...(body !== undefined ? { body } : {}),
    ...(pinned !== undefined ? { pinned: !!pinned } : {}),
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  await requireAdmin()
  const { noteId } = await params
  if (!getNoteClientId(noteId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  deleteNote(noteId)
  return NextResponse.json({ ok: true })
}
