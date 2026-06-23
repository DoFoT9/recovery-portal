import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { getInboxClients } from '@/lib/inbox'

export async function GET(req: Request) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const onlyUnread = searchParams.get('unread') === '1'
  const limit = Number(searchParams.get('limit') ?? 200)

  const clients = getInboxClients({ onlyUnread, limit })
  return NextResponse.json(
    { clients },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
