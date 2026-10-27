// components/onboarding/ReplayClientTourButton.tsx
//
// v7.8 — lets a client replay the welcome tour (drop into the client account menu
// or account page). Clears their own onboarding flag, then fires the event the
// ClientTourProvider listens for.

'use client'

import { useState } from 'react'
import { Compass } from 'lucide-react'

export function ReplayClientTourButton({
  label = 'Replay welcome tour',
  className = '',
}: { label?: string; className?: string }) {
  const [busy, setBusy] = useState(false)

  async function start() {
    setBusy(true)
    try {
      await fetch('/api/onboarding/reset', { method: 'POST' })
    } catch { /* non-fatal */ }
    setBusy(false)
    window.dispatchEvent(new Event('rp-client-tour:start'))
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
