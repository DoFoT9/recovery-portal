'use client'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function InboxDebugPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/inbox/debug', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox Debug</h1>
        <button onClick={load} className="btn-secondary" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-900">
          <p className="text-sm text-red-700 dark:text-red-300 font-semibold">
            Error: {error}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            If this is 401/403, you are not logged in as admin.
          </p>
        </div>
      )}

      {data && (
        <>
          <section className="card space-y-2">
            <h2 className="font-semibold">Counts</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-neutral-500">Total comments</div>
              <div className="font-mono">{data.stats.totalComments}</div>
              <div className="text-neutral-500">By clients</div>
              <div className="font-mono">{data.stats.clientComments}</div>
              <div className="text-neutral-500">By admins</div>
              <div className="font-mono">{data.stats.adminComments}</div>
              <div className="text-neutral-500 font-semibold">
                Unread (should match badge)
              </div>
              <div className="font-mono font-bold text-brand">
                {data.stats.unreadCount}
              </div>
              <div className="text-neutral-500">Inbox clients total</div>
              <div className="font-mono">{data.stats.inboxClientsTotal}</div>
              <div className="text-neutral-500">Inbox clients w/ unread</div>
              <div className="font-mono">{data.stats.inboxClientsWithUnread}</div>
            </div>
          </section>

          <section className="card space-y-2">
            <h2 className="font-semibold">
              Recent client comments (last 10)
            </h2>
            {data.recentClientComments.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No client comments in DB. <strong>This is why the badge is empty.</strong>
                {' '}Have a test client post a comment on an assignment.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {data.recentClientComments.map((c: any) => (
                  <li key={c.id} className={`border-l-4 pl-2 py-1 ${
                    c.is_unread ? 'border-brand' : 'border-neutral-200 dark:border-neutral-800'
                  }`}>
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {c.author_name || 'unknown'}
                      </span>
                      <span className={`text-[10px] uppercase ${
                        c.is_unread ? 'text-brand font-semibold' : 'text-neutral-400'
                      }`}>
                        {c.is_unread ? 'UNREAD' : 'read'}
                      </span>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300 truncate">
                      {c.body}
                    </p>
                    <p className="text-neutral-400">
                      created: {c.created_at}
                      {' \u00b7 '}
                      last_seen: {c.last_comments_seen_by_admin_at || 'never'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card space-y-2">
            <h2 className="font-semibold">Admin context</h2>
            <pre className="text-xs bg-neutral-50 dark:bg-neutral-900 p-3 rounded overflow-x-auto">
{JSON.stringify(data.admin, null, 2)}
            </pre>
            <p className="text-xs text-neutral-500">
              Snapshot taken: {data.timestamp}
            </p>
          </section>
        </>
      )}
    </div>
  )
}
