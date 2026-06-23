import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { subscribeUser, unsubscribeUser, isPushConfigured } from '@/lib/push'

export async function GET() {
  return NextResponse.json({ configured: isPushConfigured() })
}

export async function POST(req: Request) {
  const user = await requireUser()
  const { subscription, userAgent } = await req.json()
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }
  subscribeUser(user.id, subscription, userAgent)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const user = await requireUser()
  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
  unsubscribeUser(user.id, endpoint)
  return NextResponse.json({ ok: true })
}
