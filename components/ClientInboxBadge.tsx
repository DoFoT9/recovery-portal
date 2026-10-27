// components/ClientInboxBadge.tsx
//
// v7.5.2 (item 5) — optional small "you have a reply" pill for the CLIENT nav.
// The dashboard banner (ClientInboxBanner) is the primary indicator; use this too
// if you want a count next to a nav link. Polls /api/client-inbox/unread-count.

'use client'

import { useEffect, useState } from 'react'

export default function ClientInboxBadge({
  pollMs = 30_000,
}: { pollMs?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/client-inbox/unread-count', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { count: number }
        if (!cancelled) setCount(data.count ?? 0)
      } catch {
        /* offline / silent */
      }
    }

    fetchCount()
    const timer = setInterval(fetchCount, pollMs)
    const onRefresh = () => fetchCount()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCount() }

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

  if (count <= 0) return null

  return (
    <span
      className="ml-1 inline-flex items-center justify-center text-[10px] font-semibold
                 rounded-full px-1.5 py-0.5 min-w-[18px] text-center bg-red-500 text-white"
      aria-label={`${count} unread ${count === 1 ? 'reply' : 'replies'} from your clinician`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
