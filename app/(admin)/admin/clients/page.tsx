import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { CreateClientForm } from '@/components/admin/CreateClientForm'
import { ClientActions } from '@/components/admin/ClientActions'
import {
  getClientSummary, hasNewActivityForClient,
  markAdminViewedClientsList, getUnreadCommentsCountByClient,
} from '@/lib/activity'
import { timeAgo } from '@/lib/utils'
import { Bell, MessageCircle, Ban } from 'lucide-react'

export default async function ClientsPage() {
  const admin = await requireAdmin()
  const db = getDb()
  const sinceIso = admin.last_seen_clients_at
  const unreadByClient = getUnreadCommentsCountByClient()
  const clients = db.prepare(
    "select id, email, full_name, role, disabled_at, created_at, last_active_at from users where role='client' order by disabled_at is not null, created_at desc"
  ).all() as any[]
  const enriched = clients.map(c => ({
    ...c,
    summary: getClientSummary(c.id),
    hasNew: hasNewActivityForClient(c.id, sinceIso),
    unreadComments: unreadByClient[c.id] || 0,
  }))
  markAdminViewedClientsList(admin.id)

  const activeCount   = enriched.filter(c => !c.disabled_at).length
  const disabledCount = enriched.filter(c =>  c.disabled_at).length

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {activeCount} active{disabledCount > 0 ? ` · ${disabledCount} disabled` : ''}
          </p>
        </div>
        <CreateClientForm />
      </div>

      <div className="space-y-2">
        {enriched.length === 0 && (
          <p className="card text-sm text-neutral-500">No clients yet.</p>
        )}
        {enriched.map(c => {
          const isDisabled = !!c.disabled_at
          return (
            <div
              key={c.id}
              className={`card flex items-center gap-3 ${isDisabled ? 'opacity-60' : ''}`}
            >
              <Link
                href={`/admin/clients/${c.id}`}
                className="flex-1 min-w-0 flex items-center gap-3 hover:opacity-90 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold flex items-center gap-2 flex-wrap">
                    <span className="truncate">{c.full_name || c.email}</span>
                    {isDisabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 rounded-full px-1.5 py-0.5">
                        <Ban className="h-2.5 w-2.5" /> Disabled
                      </span>
                    )}
                    {!isDisabled && c.hasNew && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-white bg-brand rounded-full px-1.5 py-0.5">
                        <Bell className="h-2.5 w-2.5" /> new
                      </span>
                    )}
                    {!isDisabled && c.unreadComments > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-white bg-red-500 rounded-full px-1.5 py-0.5">
                        <MessageCircle className="h-2.5 w-2.5" /> {c.unreadComments}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate">{c.email}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {c.summary.activeAssignments} active · {c.summary.completedAssignments} completed
                    {' · '}
                    last active {timeAgo(c.summary.lastActiveAt)}
                  </p>
                </div>
              </Link>
              <ClientActions client={c} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
