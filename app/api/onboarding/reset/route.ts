// app/api/onboarding/reset/route.ts
// v7.8 — any logged-in user restarts THEIR OWN tour (admin StartTourButton and
// the client "replay tour" both use this). Only affects the caller's own id.

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { resetOnboarding } from '@/lib/onboarding'

export async function POST() {
  const user = await requireUser()
  resetOnboarding(user.id)
  return NextResponse.json({ ok: true })
}
