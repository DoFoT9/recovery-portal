'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Activity, ClipboardList, MessageCircle, Settings as SettingsIcon,
  ArrowLeft, ChevronRight,
} from 'lucide-react'
import { AssignmentManager } from '@/components/admin/AssignmentManager'
import { ClientDetailsEditor } from '@/components/admin/ClientDetailsEditor'
import { CommentsThread } from '@/components/client/CommentsThread'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { timeAgo } from '@/lib/utils'

export type TabKey = 'overview' | 'assignments' | 'conversations' | 'account'

interface Props {
  initialTab: TabKey
  client: any
  rehabTypes: any[]
  assignments: any[]
  unreadByAssignment: Record<string, number>
  activity: any[]
  adminUserId: string
}

const TAB_DEFS: { key: TabKey; label: string; Icon: typeof Activity }[] = [
  { key: 'overview',      label: 'Overview',      Icon: Activity },
  { key: 'assignments',   label: 'Assignments',   Icon: ClipboardList },
  { key: 'conversations', label: 'Conversations', Icon: MessageCircle },
  { key: 'account',       label: 'Account',       Icon: SettingsIcon },
]

const KIND_LABEL: Record<string, string> = {
  comment:   'commented on',
  milestone: 'completed milestone',
  completed: 'completed assignment',
  video:     'watched video',
}

export default function ClientTabs({
  initialTab, client, rehabTypes, assignments, unreadByAssignment, activity, adminUserId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [active, setActive] = useState<TabKey>(initialTab)
  const [, startTransition] = useTransition()

  const clearedRef = useRef(false)

  useEffect(() => {
    if (active !== 'conversations') return
    if (clearedRef.current) return
    clearedRef.current = true
    fetch(`/api/inbox/${client.id}/read`, { method: 'POST' })
      .then(() => {
        window.dispatchEvent(new Event('inbox:refresh'))
      })
      .catch(() => {})
  }, [active, client.id])

  const setTab = (k: TabKey) => {
    setActive(k)
    const sp = new URLSearchParams(params.toString())
    sp.set('tab', k)
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`))
  }

  const activeCount    = assignments.filter(a => a.status !== 'completed').length
  const completedCount = assignments.filter(a => a.status === 'completed').length
  const nextAssignment = assignments.find(a => a.status !== 'completed')
  const hasAnyComments = assignments.length > 0
  const totalUnread = Object.values(unreadByAssignment).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-4">
      <div>
        <nav className="text-xs text-neutral-500 flex items-center gap-1" aria-label="Breadcrumb">
          <Link href="/admin/clients" className="hover:text-neutral-700 dark:hover:text-neutral-200 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Clients
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-neutral-700 dark:text-neutral-200 font-medium">
            {client.full_name || client.email}
          </span>
        </nav>
        <h1 className="text-2xl font-bold mt-1">
          {client.full_name || client.email}
        </h1>
        <p className="text-sm text-neutral-500">{client.email}</p>
      </div>

      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-1 sm:gap-4 overflow-x-auto" role="tablist">
          {TAB_DEFS.map(({ key, label, Icon }) => {
            const isActive = active === key
            const showUnreadBadge = key === 'conversations' && !isActive && totalUnread > 0
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 py-2.5 px-3 text-sm border-b-2 -mb-px transition whitespace-nowrap ${
                  isActive
                    ? 'border-brand text-brand font-medium'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {showUnreadBadge && (
                  <span className="text-[10px] font-semibold bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {active === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="card lg:col-span-2 space-y-3">
            <h2 className="font-semibold">Client summary</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-neutral-500">Full name</dt>
                <dd>{client.full_name || '\u2014'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd>{client.email}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Active assignments</dt>
                <dd>{activeCount}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Completed</dt>
                <dd>{completedCount}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-neutral-500">Last active</dt>
                <dd>{client.last_active_at ? timeAgo(client.last_active_at) : 'never'}</dd>
              </div>
            </dl>
          </section>
          <section className="card space-y-2">
            <h2 className="font-semibold">Next assignment</h2>
            {nextAssignment ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: nextAssignment.type_color }} />
                  <span className="font-medium">{nextAssignment.type_name}</span>
                </div>
                <div className="text-xs text-neutral-500">
                  {nextAssignment.stage_name || 'Whole programme'}
                </div>
                <StatusBadge status={nextAssignment.status} />
                <ProgressBar
                  percent={nextAssignment.progress?.percent ?? 0}
                  label={`${nextAssignment.progress?.done ?? 0} / ${nextAssignment.progress?.total ?? 0}`}
                />
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No active assignments.</p>
            )}
          </section>
          <section className="card lg:col-span-3 space-y-2">
            <h2 className="font-semibold">Recent activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-neutral-500">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {activity.map((a: any, i: number) => (
                  <li key={i} className="py-2 text-sm flex justify-between gap-3">
                    <span className="text-neutral-700 dark:text-neutral-200">
                      <span className="text-neutral-400">{a.actor || 'someone'}</span>{' '}
                      {KIND_LABEL[a.kind] || a.kind}{' '}
                      <span className="text-neutral-500">{'\u2014'} {a.type_name}</span>
                      {a.detail && (
                        <span className="block text-xs text-neutral-500 mt-0.5 line-clamp-1">
                          {a.detail}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-neutral-400 flex-shrink-0">
                      {timeAgo(a.ts)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {active === 'assignments' && (
        <AssignmentManager
          clientId={client.id}
          clientEmail={client.email}
          rehabTypes={rehabTypes}
          existing={assignments}
          unreadByAssignment={unreadByAssignment}
          currentUserId={adminUserId}
        />
      )}

      {active === 'conversations' && (
        <div className="space-y-4">
          {!hasAnyComments ? (
            <EmptyState
              icon={<MessageCircle className="h-10 w-10" strokeWidth={1.5} />}
              title="No assignments yet"
              description="Create an assignment first \u2014 conversations are scoped per assignment."
            />
          ) : (
            assignments.map(a => {
              const unread = unreadByAssignment[a.id] || 0
              return (
                <section key={a.id} className="card space-y-3">
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="h-3 w-3 mt-1.5 rounded-full flex-shrink-0" style={{ background: a.type_color }} />
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {a.type_name}
                          {unread > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-white bg-brand rounded-full px-1.5 py-0.5">
                              {unread} new
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {a.stage_name || 'Whole programme'}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </header>
                  <CommentsThread
                    assignmentId={a.id}
                    currentUserId={adminUserId}
                    currentUserRole="admin"
                  />
                </section>
              )
            })
          )}
        </div>
      )}

      {active === 'account' && (
        <ClientDetailsEditor client={client} />
      )}
    </div>
  )
}
