'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import PulsingDot from '@/components/PulsingDot'
import type { InboxClient } from '@/lib/inbox'

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

export default function InboxList({ clients }: { clients: InboxClient[] }) {
  const router = useRouter()
  const [items, setItems] = useState(clients)

  const open = async (c: InboxClient) => {
    try {
      await fetch(`/api/inbox/${c.client_id}/read`, { method: 'POST' })
      window.dispatchEvent(new Event('inbox:refresh'))
      setItems(prev =>
        prev.map(x =>
          x.client_id === c.client_id ? { ...x, unread_count: 0 } : x,
        ),
      )
      router.push(`/admin/clients/${c.client_id}?tab=conversations`)
    } catch {
      toast.error('Could not open conversation')
    }
  }

  return (
    <div className="card !p-0 overflow-hidden">
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {items.map(c => {
          const isUnread = c.unread_count > 0
          const displayName = c.full_name || c.email
          const authorPrefix =
            c.last_message_author_role === 'admin'
              ? 'You'
              : c.last_message_author_name || displayName

          // Left border kept at 4px transparent for read rows so the layout
          // doesn't jitter when a row transitions from unread to read.
          const rowCls = isUnread
            ? 'bg-brand/5 hover:bg-brand/10 dark:bg-brand/10 dark:hover:bg-brand/20 border-l-4 border-brand'
            : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/40 border-l-4 border-transparent'

          return (
            <li key={c.client_id}>
              <button
                onClick={() => open(c)}
                className={`w-full text-left px-4 py-3 transition flex gap-3 items-start ${rowCls}`}
              >
                <div className="flex-shrink-0 mt-1.5 w-2">
                  {isUnread ? (
                    <PulsingDot ariaLabel={`${c.unread_count} unread`} />
                  ) : (
                    <span className="inline-block w-2 h-2" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        isUnread
                          ? 'font-semibold text-neutral-900 dark:text-neutral-100 truncate'
                          : 'font-medium text-neutral-700 dark:text-neutral-200 truncate'
                      }
                    >
                      {displayName}
                    </span>
                    <span className="text-xs text-neutral-400 flex-shrink-0">
                      {relativeTime(c.last_message_at)}
                    </span>
                  </div>

                  <p className={`text-sm truncate mt-0.5 ${
                    isUnread
                      ? 'text-neutral-700 dark:text-neutral-200'
                      : 'text-neutral-500'
                  }`}>
                    <span className="text-neutral-400">{authorPrefix}:</span>{' '}
                    {c.last_message_body || 'No comments'}
                  </p>

                  {isUnread && (
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wide font-semibold text-white bg-brand px-1.5 py-0.5 rounded">
                      {c.unread_count} new
                    </span>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
