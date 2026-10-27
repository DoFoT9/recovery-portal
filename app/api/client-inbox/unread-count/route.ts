// app/api/client-inbox/unread-count/route.ts
//
// v7.5.2 (item 5) — polled by the client nav badge, mirrors the admin
// /api/inbox/unread-count route.

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getClientUnreadReplyCount } from '@/lib/client-inbox'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireUser()
  const count = getClientUnreadReplyCount(user.id)
  return NextResponse.json({ count })
}
