// app/api/onboarding/complete/route.ts
// v7.8 — any logged-in user marks THEIR OWN tour finished/skipped.
// (Generalised from admin-only so the client tour can use the same endpoint.
//  It only ever affects the caller's own id, so requireUser is safe.)

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { setOnboardingComplete } from '@/lib/onboarding'

export async function POST() {
  const user = await requireUser()
  setOnboardingComplete(user.id)
  return NextResponse.json({ ok: true })
}
