import { NextResponse } from 'next/server'
import { requireUser, setUserTheme } from '@/lib/auth'

export async function POST(req: Request) {
  const user = await requireUser()
  const { theme } = await req.json()
  try {
    setUserTheme(user.id, theme)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
