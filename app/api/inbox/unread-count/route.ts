import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { getTotalUnreadCount } from '@/lib/inbox'

export async function GET() {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = user.role === 'admin' ? getTotalUnreadCount() : 0
  return NextResponse.json(
    { count },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
