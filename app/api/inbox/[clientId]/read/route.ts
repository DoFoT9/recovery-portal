import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { markAllClientCommentsRead } from '@/lib/inbox'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  await requireAdmin()
  const { clientId } = await params
  markAllClientCommentsRead(clientId)
  return NextResponse.json({ ok: true })
}
