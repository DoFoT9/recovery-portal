import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getCombinedAssignmentProgress } from '@/lib/milestones'
import { getUnreadCommentsForAssignments } from '@/lib/activity'
import ClientTabs, { type TabKey } from './ClientTabs'

const TABS: TabKey[] = ['overview', 'assignments', 'conversations', 'account']

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const admin = await requireAdmin()
  const { id } = await params
  const { tab } = await searchParams

  const db = getDb()
  const client = db.prepare(
    "select id, email, full_name, role, theme_preference, last_active_at, disabled_at from users where id = ? and role = 'client'"
  ).get(id) as any
  if (!client) notFound()

  const rehabTypes = db.prepare(`
    select rt.id, rt.name, rt.color, rt.order_index,
           (select json_group_array(json_object(
             'id', s.id, 'name', s.name, 'order_index', s.order_index
           )) from stages s where s.rehab_type_id = rt.id order by s.order_index) as stages_json
    from rehab_types rt
    order by rt.order_index, rt.name
  `).all() as any[]

  const rehabTypesEnriched = rehabTypes.map(t => {
    let stages: any[] = []
    try { stages = JSON.parse(t.stages_json || '[]') } catch { stages = [] }
    stages.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    return { id: t.id, name: t.name, color: t.color, stages }
  })

  const assignmentsRaw = db.prepare(`
    select ca.*,
           rt.name as type_name, rt.color as type_color,
           s.name  as stage_name,
           coalesce(
             (select max(c.created_at) from assignment_comments c where c.assignment_id = ca.id),
             ca.completed_at, ca.started_at, ca.assigned_at
           ) as last_activity_at
      from client_assignments ca
      join rehab_types rt on rt.id = ca.rehab_type_id
      left join stages s on s.id = ca.stage_id
     where ca.client_id = ?
     order by ca.assigned_at desc
  `).all(id) as any[]

  const assignments = assignmentsRaw.map(a => ({
    ...a,
    progress: getCombinedAssignmentProgress(a.id),
  }))

  const unreadByAssignment = getUnreadCommentsForAssignments(assignments.map(a => a.id))

  const activity = db.prepare(`
    select * from (
      select 'comment' as kind, c.created_at as ts,
             u.full_name as actor, u.role as actor_role,
             rt.name as type_name, c.body as detail
        from assignment_comments c
        join users u on u.id = c.author_id
        join client_assignments ca on ca.id = c.assignment_id
        join rehab_types rt on rt.id = ca.rehab_type_id
       where ca.client_id = ?
      union all
      select 'milestone' as kind, cm.completed_at as ts,
             u.full_name as actor, u.role as actor_role,
             rt.name as type_name, m.title as detail
        from client_milestones cm
        join users u on u.id = cm.client_id
        join milestones m on m.id = cm.milestone_id
        join stages s on s.id = m.stage_id
        join rehab_types rt on rt.id = s.rehab_type_id
       where cm.client_id = ?
      union all
      select 'completed' as kind, ca.completed_at as ts,
             u.full_name as actor, u.role as actor_role,
             rt.name as type_name, 'Marked assignment complete' as detail
        from client_assignments ca
        join users u on u.id = ca.client_id
        join rehab_types rt on rt.id = ca.rehab_type_id
       where ca.client_id = ? and ca.completed_at is not null
      union all
      select 'video' as kind, vv.watched_at as ts,
             u.full_name as actor, u.role as actor_role,
             coalesce(rt.name, rt2.name) as type_name,
             v.title as detail
        from video_views vv
        join users u on u.id = vv.client_id
        join videos v on v.id = vv.video_id
        left join stages s on s.id = v.stage_id
        left join rehab_types rt on rt.id = s.rehab_type_id
        left join rehab_types rt2 on rt2.id = v.rehab_type_id
       where vv.client_id = ?
    )
    where ts is not null
    order by ts desc
    limit 5
  `).all(id, id, id, id) as any[]

  const initialTab: TabKey = TABS.includes(tab as TabKey) ? (tab as TabKey) : 'overview'

  return (
    <ClientTabs
      initialTab={initialTab}
      client={client}
      rehabTypes={rehabTypesEnriched}
      assignments={assignments}
      unreadByAssignment={unreadByAssignment}
      activity={activity}
      adminUserId={admin.id}
    />
  )
}
