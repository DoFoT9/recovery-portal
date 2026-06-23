import { requireAdmin } from '@/lib/auth'
import { getInboxClients } from '@/lib/inbox'
import { EmptyState } from '@/components/shared/EmptyState'
import UnreadTitle from '@/components/UnreadTitle'
import { Inbox as InboxIcon } from 'lucide-react'
import { DashboardAutoRefresh } from '@/components/admin/DashboardAutoRefresh'
import InboxList from './InboxList'
import InboxFilters from './InboxFilters'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ unread?: string }>
}) {
  await requireAdmin()
  const { unread } = await searchParams
  const onlyUnread = unread === '1'

  const clients = getInboxClients({ onlyUnread, limit: 200 })

  return (
    <DashboardAutoRefresh intervalMs={20_000}>
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-4">
        <UnreadTitle baseTitle="Inbox · Recovery Portal" />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <nav className="text-xs text-neutral-500" aria-label="Breadcrumb">
              Admin /{' '}
              <span className="text-neutral-700 dark:text-neutral-200 font-medium">
                Inbox
              </span>
            </nav>
            <h1 className="text-2xl font-bold mt-1">Inbox</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              All client comments across every assignment, newest first.
            </p>
          </div>
          <InboxFilters />
        </div>

        {clients.length === 0 ? (
          <EmptyState
            icon={<InboxIcon className="h-10 w-10" strokeWidth={1.5} />}
            title="Zero messages"
            description={
              onlyUnread
                ? "You're all caught up — no unread comments."
                : "When clients leave comments on their assignments, they'll show up here."
            }
          />
        ) : (
          <InboxList clients={clients} />
        )}
      </div>
    </DashboardAutoRefresh>
  )
}
