// lib/onboarding.ts
//
// v7.6 — server helpers for the admin onboarding tour.
// Kept separate from lib/auth so we don't have to touch currentUser()'s column list.

import 'server-only'
import { getDb } from '@/lib/db'

/** True once the admin has finished or skipped the tour. */
export function getOnboardingComplete(userId: string): boolean {
  const row = getDb()
    .prepare('select onboarding_completed_at from users where id = ?')
    .get(userId) as any
  return !!row?.onboarding_completed_at
}

/** Mark the tour finished/skipped for this admin. */
export function setOnboardingComplete(userId: string): void {
  getDb()
    .prepare("update users set onboarding_completed_at = datetime('now') where id = ?")
    .run(userId)
}

/** Clear the flag so the tour can be restarted (e.g. from Settings). */
export function resetOnboarding(userId: string): void {
  getDb()
    .prepare('update users set onboarding_completed_at = null where id = ?')
    .run(userId)
}
