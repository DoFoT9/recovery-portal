// components/client/ClientInboxBanner.tsx
//
// v7.5.2 (item 5) — the primary "your clinician replied" indicator for CLIENTS.
// Rendered in the client layout's <main>, so it appears at the top of the dashboard
// (and any client page). It:
//   - polls /api/client-inbox/summary every ~20s (plus on tab focus / visibility)
//   - flashes red (animate-rp-flash, defined in tailwind.config.ts) when unread > 0
//   - deep-links straight to the latest conversation
//   - has a dismiss (×) that marks everything read
//   - self-clears instantly when a conversation is opened (listens for
//     the 'client-inbox:refresh' event fired by ClientMarkRepliesRead)
//
// Returns null when there's nothing unread, so it's invisible until it matters.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox, X } from 'lucide-react'

interface Summary { count: number; latestAssignmentId: string | null }

export function ClientInboxBanner({ pollMs = 20_000 }: { pollMs?: number }) {
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [href, setHref] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/client-inbox/summary', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as Summary
        if (cancelled) return
        setCount(data.count ?? 0)
        setHref(data.latestAssignmentId ? `/assignment/${data.latestAssignmentId}` : null)
      } catch {
        /* offline / silent */
      }
    }

    fetchSummary()
    const timer = setInterval(fetchSummary, pollMs)
    const onRefresh = () => fetchSummary()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchSummary() }

    window.addEventListener('client-inbox:refresh', onRefresh)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onRefresh)

    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('client-inbox:refresh', onRefresh)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onRefresh)
    }
  }, [pollMs])

  async function dismiss(e: React.MouseEvent) {
    e.stopPropagation()
    // Optimistic: hide immediately, then persist "mark all read".
    setCount(0)
    try {
      await fetch('/api/client-inbox/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      window.dispatchEvent(new Event('client-inbox:refresh'))
    } catch {
      /* if it fails, the next poll will re-show it */
    }
  }

  function open() {
    if (href) router.push(href)
  }

  if (count <= 0) return null

  const label =
    count === 1 ? 'You have a new reply from your clinician'
                : `You have ${count} new replies from your clinician`

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 pt-4">
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open() }}
        className="animate-rp-flash flex items-center gap-3 rounded-xl border border-red-500/40
                   bg-red-500/10 px-4 py-3 cursor-pointer transition hover:bg-red-500/15
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label={label}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <Inbox className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-700 dark:text-red-300">{label}</p>
          <p className="text-xs text-red-600/80 dark:text-red-300/70">
            {href ? 'Tap to read the message.' : 'Open your recovery plan to read it.'}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Mark all replies as read"
          title="Mark as read"
          className="flex-shrink-0 rounded-md p-1.5 text-red-600/70 hover:bg-red-500/15
                     hover:text-red-700 dark:text-red-300/70 dark:hover:text-red-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
