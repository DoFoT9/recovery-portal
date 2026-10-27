// components/onboarding/StartTourButton.tsx
//
// v7.6 — "Restart tutorial" button. Drop it into Settings (or the dashboard).
// Clears the server-side onboarding flag, then fires the window event that
// TourProvider listens for to (re)start the tour immediately.

'use client'

import { useState } from 'react'
import { Compass } from 'lucide-react'

export function StartTourButton({
  label = 'Restart tutorial',
  className = '',
}: { label?: string; className?: string }) {
  const [busy, setBusy] = useState(false)

  async function start() {
    setBusy(true)
    try {
      // Clear the persisted "completed" flag so it won't be considered done.
      await fetch('/api/onboarding/reset', { method: 'POST' })
    } catch { /* non-fatal */ }
    setBusy(false)
    window.dispatchEvent(new Event('rp-tour:start'))
  }

  return (
    <button
      onClick={start}
      disabled={busy}
      className={
        className ||
        'inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm ' +
        'text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 ' +
        'dark:hover:bg-neutral-800'
      }
    >
      <Compass className="h-4 w-4" />
      {busy ? 'Starting…' : label}
    </button>
  )
}
