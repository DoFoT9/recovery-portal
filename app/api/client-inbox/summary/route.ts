// app/api/client-inbox/summary/route.ts
//
// v7.5.2 (item 5) — polled by the dashboard banner. Returns the unread reply count
// plus the assignment id of the latest unread reply for deep-linking.

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getClientInboxSummary } from '@/lib/client-inbox'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireUser()
  const summary = getClientInboxSummary(user.id)
  return NextResponse.json(summary)
}
