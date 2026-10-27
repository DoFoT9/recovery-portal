// app/api/admin/clients/[id]/notes/route.ts
//
// v7.7 — list + create notes for a specific client. Admin-only.
//   GET  -> [{ note }...]  (pinned first, newest first)
//   POST { title?, body? } -> { note }

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listNotesForClient, createNote } from '@/lib/notes'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin()
  const { id } = await params
  return NextResponse.json({ notes: listNotesForClient(id) })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  const { id } = await params
  const { title, body } = await req.json().catch(() => ({}))
  const note = createNote(id, admin.id, String(title || ''), String(body || ''))
  return NextResponse.json({ note })
}
