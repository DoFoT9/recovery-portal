import Link from 'next/link'
import { getDb } from '@/lib/db'
import {
  Users, FolderTree, Video, Upload, BarChart3, Activity,
  AlertTriangle, ChevronDown,
} from 'lucide-react'
import { getStaleClients, getRecentActivity } from '@/lib/activity'
import { DashboardAutoRefresh } from '@/components/admin/DashboardAutoRefresh'
import { RecentActivityItem } from '@/components/admin/RecentActivityItem'

export default async function AdminHome() {
  const db = getDb()
  const clients = (db.prepare("select count(*) c from users where role='client'").get() as any).c
  const types   = (db.prepare("select count(*) c from rehab_types").get() as any).c
  const videos  = (db.prepare("select count(*) c from videos where status='ready'").get() as any).c
  const active  = (db.prepare("select count(*) c from client_assignments where status != 'completed'").get() as any).c

  const stale = getStaleClients(7) as any[]
  const recent = getRecentActivity(10) as any[]
  const unreadCount = recent.filter(r => r.kind === 'comment' && r.unread === 1).length

  return (
    <DashboardAutoRefresh>
      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        {/* Row 1: KPI tiles */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat label="Clients"    value={clients} icon={Users} />
          <Stat label="Rehab Types" value={types} icon={FolderTree} />
          <Stat label="Videos"     value={videos} icon={Video} />
          <Stat label="Active"     value={active} icon={Activity} />
        </div>

        {/* Row 2: Action tiles */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <ActionTile href="/admin/clients"        label="Clients"        icon={Users} />
          <ActionTile href="/admin/rehab-types"    label="Rehab Types"    icon={FolderTree} />
          <ActionTile href="/admin/videos/upload"  label="Upload Video"   icon={Upload} />
          <ActionTile href="/admin/reports"        label="Reports"        icon={BarChart3} />
        </div>

        {/* Row 3: Recent activity (now full width, prominent) */}
        <section className="card">
          <h2 className="font-semibold mb-3 flex items-center justify-between">
            <span>Recent Activity</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-brand text-white rounded-full px-2 py-0.5">
                {unreadCount} new
              </span>
            )}
          </h2>
          {recent.length === 0
            ? <p className="text-sm text-neutral-500">Nothing yet.</p>
            : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {recent.map((a: any, i: number) => (
                  <RecentActivityItem key={i} activity={a} />
                ))}
              </ul>
            )
          }
        </section>

        {/* Row 4: Stale clients (de-emphasised, collapsed) */}
        <details className="card opacity-75 group">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-600 dark:text-neutral-300 flex items-center justify-between list-none">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Stale Clients ({stale.length})
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-1.5">
            {stale.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Everyone has been active recently — nice work.
              </p>
            ) : stale.map((c: any) => (
              <Link
                key={c.id}
                href={`/admin/clients/${c.id}`}
                className="flex items-center justify-between text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 py-1"
              >
                <span>{c.full_name || c.email}</span>
                <span>
                  {c.daysSinceActive !== null ? `${c.daysSinceActive}d quiet` : 'never active'}
                </span>
              </Link>
            ))}
          </div>
        </details>
      </div>
    </DashboardAutoRefresh>
  )
}

function Stat({ label, value, icon: Icon }: any) {
  return (
    <div className="card flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs text-neutral-500 mt-1">{label}</div>
      </div>
    </div>
  )
}

function ActionTile({ href, label, icon: Icon }: any) {
  return (
    <Link
      href={href}
      className="card hover:border-brand transition flex items-center gap-3"
    >
      <Icon className="h-5 w-5 text-brand" />
      <span className="font-medium">{label}</span>
    </Link>
  )
}
