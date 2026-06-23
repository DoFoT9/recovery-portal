import Link from 'next/link'
import { getDb } from '@/lib/db'
import { getStaleClients } from '@/lib/activity'

export default async function ReportsPage() {
  const db = getDb()

  const activeByType = db.prepare(`
    select rt.name, rt.color, count(distinct ca.client_id) as clients
    from client_assignments ca
    join rehab_types rt on rt.id = ca.rehab_type_id
    where ca.status != 'completed'
    group by rt.id
    order by clients desc
  `).all() as any[]

  const adherence = db.prepare(`
    select u.id, u.full_name, u.email,
      (select count(*) from client_assignments ca where ca.client_id=u.id and ca.status != 'completed') as active,
      (select count(*) from client_assignments ca where ca.client_id=u.id and ca.status = 'completed') as completed,
      (select count(*) from client_milestones cm where cm.client_id=u.id) as milestones_done,
      (select count(*) from video_views vv where vv.client_id=u.id) as videos_watched
    from users u
    where u.role='client'
    order by milestones_done desc, videos_watched desc
    limit 20
  `).all() as any[]

  const stale = getStaleClients(7) as any[]

  const avgComplete = db.prepare(`
    select s.name as stage_name, rt.name as type_name,
      round(avg(julianday(ca.completed_at) - julianday(ca.assigned_at)), 1) as avg_days,
      count(*) as completions
    from client_assignments ca
    join stages s on s.id = ca.stage_id
    join rehab_types rt on rt.id = ca.rehab_type_id
    where ca.completed_at is not null
    group by s.id
    order by completions desc
    limit 10
  `).all() as any[]

  const topVideos = db.prepare(`
    select v.id, v.title, count(*) as views,
      coalesce(rt.name, rt2.name) as type_name, s.name as stage_name
    from video_views vv
    join videos v on v.id = vv.video_id
    left join stages s on s.id = v.stage_id
    left join rehab_types rt on rt.id = s.rehab_type_id
    left join rehab_types rt2 on rt2.id = v.rehab_type_id
    group by v.id
    order by views desc
    limit 10
  `).all() as any[]

  const maxClients = Math.max(1, ...activeByType.map((r: any) => r.clients))
  const maxViews = Math.max(1, ...topVideos.map((r: any) => r.views))

  return (
    <div className="max-w-5xl p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Link href="/admin" className="text-sm text-brand hover:underline">← Back to dashboard</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold mb-3">Active clients by rehab type</h2>
          {activeByType.length === 0
            ? <p className="text-sm text-neutral-500">No active assignments yet.</p>
            : (
              <ul className="space-y-2">
                {activeByType.map((r: any) => (
                  <li key={r.name} className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                        {r.name}
                      </span>
                      <span>{r.clients}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded">
                      <div className="h-full rounded" style={{ width: `${(r.clients / maxClients) * 100}%`, background: r.color }} />
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Stale clients (7d+)</h2>
          {stale.length === 0
            ? <p className="text-sm text-neutral-500">Nobody is stale right now.</p>
            : (
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {stale.slice(0, 10).map(c => (
                  <li key={c.id} className="py-2 text-sm flex justify-between">
                    <Link href={`/admin/clients/${c.id}`} className="hover:underline">
                      {c.full_name || c.email}
                    </Link>
                    <span className="text-amber-600 dark:text-amber-400">
                      {c.daysSinceActive !== null ? `${c.daysSinceActive}d` : 'never'}
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-3">Client adherence</h2>
          {adherence.length === 0
            ? <p className="text-sm text-neutral-500">No client activity yet.</p>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-2">Client</th>
                    <th className="py-2 text-right">Active</th>
                    <th className="py-2 text-right">Completed</th>
                    <th className="py-2 text-right">Milestones</th>
                    <th className="py-2 text-right">Videos</th>
                  </tr>
                </thead>
                <tbody>
                  {adherence.map((c: any) => (
                    <tr key={c.id} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2">
                        <Link href={`/admin/clients/${c.id}`} className="hover:underline">
                          {c.full_name || c.email}
                        </Link>
                      </td>
                      <td className="text-right">{c.active}</td>
                      <td className="text-right">{c.completed}</td>
                      <td className="text-right">{c.milestones_done}</td>
                      <td className="text-right">{c.videos_watched}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Avg time to complete (per stage)</h2>
          {avgComplete.length === 0
            ? <p className="text-sm text-neutral-500">No completed stage-level assignments yet.</p>
            : (
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {avgComplete.map((r: any, i: number) => (
                  <li key={i} className="py-2 text-sm">
                    <div className="font-medium">{r.stage_name}</div>
                    <div className="text-xs text-neutral-500 flex justify-between">
                      <span>{r.type_name}</span>
                      <span>{r.avg_days}d (n={r.completions})</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Most-watched videos</h2>
          {topVideos.length === 0
            ? <p className="text-sm text-neutral-500">No views yet.</p>
            : (
              <ul className="space-y-2">
                {topVideos.map((v: any) => (
                  <li key={v.id} className="text-sm space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{v.title}</span>
                      <span className="text-xs text-neutral-500 whitespace-nowrap">{v.views} views</span>
                    </div>
                    <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded">
                      <div className="h-full rounded bg-brand" style={{ width: `${(v.views / maxViews) * 100}%` }} />
                    </div>
                    <div className="text-xs text-neutral-500 truncate">
                      {v.stage_name ? `${v.type_name} → ${v.stage_name}` : `${v.type_name} (intro)`}
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      </div>
    </div>
  )
}
