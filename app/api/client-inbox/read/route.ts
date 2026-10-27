// app/api/client-inbox/read/route.ts
//
// v7.5.2 (item 5) — client marks admin replies as seen.
// POST {}                       -> marks ALL of this client's replies read
// POST { assignmentId: "..." }  -> marks just that conversation read
//
// Mirrors the admin /api/inbox/[clientId]/read pattern.

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { markClientRepliesRead } from '@/lib/client-inbox'

export async function POST(req: Request) {
  const user = await requireUser()
  const { assignmentId } = await req.json().catch(() => ({}))
  markClientRepliesRead(user.id, assignmentId || undefined)
  return NextResponse.json({ ok: true })
}
