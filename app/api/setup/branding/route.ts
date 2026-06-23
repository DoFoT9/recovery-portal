import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { setBranding } from '@/lib/branding'

export async function POST(req: Request) {
  // Allow only during the setup window: exactly one admin who has never logged in.
  const db = getDb()
  const admin = db.prepare(
    "SELECT id, last_active_at FROM users WHERE role = 'admin'"
  ).all() as { id: string; last_active_at: string | null }[]
  if (admin.length !== 1 || admin[0].last_active_at !== null) {
    return NextResponse.json(
      { error: 'Setup window has closed. Use admin Settings to update branding.' },
      { status: 403 },
    )
  }
  const { portal_name, footer_clinic_name } = await req.json()
  const updates: any = {}
  if (typeof portal_name === 'string' && portal_name.trim()) {
    updates.portal_name = portal_name.trim()
  }
  if (typeof footer_clinic_name === 'string') {
    updates.footer_clinic_name = footer_clinic_name.trim() || null
  }
  setBranding(updates)
  return NextResponse.json({ ok: true })
}
