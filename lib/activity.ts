import { getDb } from '@/lib/db'

export function getClientSummary(clientId: string) {
  const db = getDb()
  const u = db.prepare("select last_active_at from users where id=?").get(clientId) as any
  const a = db.prepare(`
    select
      sum(case when status != 'completed' then 1 else 0 end) as active_assignments,
      sum(case when status = 'completed' then 1 else 0 end)  as completed_assignments
    from client_assignments where client_id=?
  `).get(clientId) as any
  const m = db.prepare("select count(*) c from client_milestones where client_id=?").get(clientId) as any
  const v = db.prepare("select count(*) c, max(watched_at) latest from video_views where client_id=?").get(clientId) as any
  return {
    activeAssignments: a?.active_assignments || 0,
    completedAssignments: a?.completed_assignments || 0,
    completedMilestones: m?.c || 0,
    watchedVideos: v?.c || 0,
    lastActiveAt: u?.last_active_at || null,
    lastVideoWatchedAt: v?.latest || null,
  }
}

export function getStaleClients(daysThreshold: number) {
  const db = getDb()
  const rows = db.prepare(`
    select u.id, u.full_name, u.email, u.last_active_at,
      (select count(*) from client_assignments ca where ca.client_id=u.id and ca.status != 'completed') as active_assignments
    from users u
    where u.role = 'client'
      and (u.last_active_at is null
           or julianday('now') - julianday(u.last_active_at) > ?)
    order by coalesce(u.last_active_at, '1970-01-01') asc
    limit 50
  `).all(daysThreshold) as any[]
  return rows.map(r => ({
    ...r,
    daysSinceActive: r.last_active_at
      ? Math.floor((Date.now() - new Date(r.last_active_at).getTime()) / 86400000)
      : null,
  }))
}

export function hasNewActivityForClient(clientId: string, sinceIso: string | null) {
  if (!sinceIso) return true
  const db = getDb()
  const row = db.prepare(`
    select 1 from (
      select created_at as t from assignment_comments c
        where c.author_id = ?  and datetime(c.created_at) > datetime(?)
      union all
      select completed_at as t from client_milestones cm
        where cm.client_id = ? and datetime(cm.completed_at) > datetime(?)
      union all
      select watched_at as t from video_views vv
        where vv.client_id = ? and datetime(vv.watched_at) > datetime(?)
      union all
      select completed_at as t from client_assignments ca
        where ca.client_id = ? and ca.completed_at is not null and datetime(ca.completed_at) > datetime(?)
    ) limit 1
  `).get(clientId, sinceIso, clientId, sinceIso, clientId, sinceIso, clientId, sinceIso)
  return !!row
}

export function getClientsWithUnseenActivity(adminLastSeenAt: string | null) {
  const db = getDb()
  const clients = db.prepare("select id from users where role='client'").all() as any[]
  const result: Record<string, boolean> = {}
  for (const c of clients) {
    result[c.id] = hasNewActivityForClient(c.id, adminLastSeenAt)
  }
  return result
}

export function markAdminViewedClientsList(adminId: string) {
  getDb().prepare("update users set last_seen_clients_at = datetime('now') where id = ?").run(adminId)
}

export function markAdminViewedClient(clientId: string) {
  getDb().prepare(`
    update client_assignments
       set last_seen_by_admin_at = datetime('now'),
           last_comments_seen_by_admin_at = datetime('now')
     where client_id = ?
  `).run(clientId)
}

export function markAdminViewedAssignment(assignmentId: string) {
  getDb().prepare(`
    update client_assignments
       set last_seen_by_admin_at = datetime('now'),
           last_comments_seen_by_admin_at = datetime('now')
     where id = ?
  `).run(assignmentId)
}

export function getUnreadCommentsCountByClient(): Record<string, number> {
  const db = getDb()
  const rows = db.prepare(`
    select ca.client_id as client_id, count(*) as unread
    from assignment_comments c
    join client_assignments ca on ca.id = c.assignment_id
    join users u on u.id = c.author_id
    where u.role = 'client'
      and (ca.last_comments_seen_by_admin_at is null
           or datetime(c.created_at) > datetime(ca.last_comments_seen_by_admin_at))
    group by ca.client_id
  `).all() as any[]
  const out: Record<string, number> = {}
  rows.forEach(r => { out[r.client_id] = r.unread })
  return out
}

export function getUnreadCommentsByAssignment(assignmentId: string): number {
  const db = getDb()
  const row = db.prepare(`
    select count(*) c from assignment_comments c
    join client_assignments ca on ca.id = c.assignment_id
    join users u on u.id = c.author_id
    where ca.id = ?
      and u.role = 'client'
      and (ca.last_comments_seen_by_admin_at is null
           or datetime(c.created_at) > datetime(ca.last_comments_seen_by_admin_at))
  `).get(assignmentId) as any
  return row?.c || 0
}

export function getUnreadCommentsForAssignments(assignmentIds: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  if (!assignmentIds.length) return out
  const db = getDb()
  for (const id of assignmentIds) {
    const row = db.prepare(`
      select count(*) c from assignment_comments c
      join client_assignments ca on ca.id = c.assignment_id
      join users u on u.id = c.author_id
      where ca.id = ?
        and u.role = 'client'
        and (ca.last_comments_seen_by_admin_at is null
             or datetime(c.created_at) > datetime(ca.last_comments_seen_by_admin_at))
    `).get(id) as any
    if (row?.c) out[id] = row.c
  }
  return out
}

export function getRecentActivity(limit = 20) {
  const db = getDb()
  return db.prepare(`
    select * from (
      select 'comment' as kind, c.created_at as ts, u.full_name as actor, u.email as actor_email,
             u.id as actor_id, u.role as actor_role,
             ca.id as assignment_id, ca.client_id as client_id,
             rt.name as type_name, c.body as detail,
             case when u.role='client' and (ca.last_comments_seen_by_admin_at is null
                  or datetime(c.created_at) > datetime(ca.last_comments_seen_by_admin_at)) then 1 else 0 end as unread
      from assignment_comments c
      join users u on u.id = c.author_id
      join client_assignments ca on ca.id = c.assignment_id
      join rehab_types rt on rt.id = ca.rehab_type_id
      union all
      select 'milestone' as kind, cm.completed_at as ts, u.full_name as actor, u.email as actor_email,
             u.id as actor_id, u.role as actor_role,
             ca.id as assignment_id, ca.client_id as client_id,
             rt.name as type_name, m.title as detail, 0 as unread
      from client_milestones cm
      join users u on u.id = cm.client_id
      join milestones m on m.id = cm.milestone_id
      join stages s on s.id = m.stage_id
      join client_assignments ca
        on ca.client_id = cm.client_id
        and (ca.stage_id = s.id or (ca.stage_id is null and ca.rehab_type_id = s.rehab_type_id))
      join rehab_types rt on rt.id = ca.rehab_type_id
      union all
      select 'completed' as kind, ca.completed_at as ts, u.full_name as actor, u.email as actor_email,
             u.id as actor_id, u.role as actor_role,
             ca.id as assignment_id, ca.client_id as client_id,
             rt.name as type_name, 'Marked assignment complete' as detail, 0 as unread
      from client_assignments ca
      join users u on u.id = ca.client_id
      join rehab_types rt on rt.id = ca.rehab_type_id
      where ca.completed_at is not null
      union all
      select 'video' as kind, vv.watched_at as ts, u.full_name as actor, u.email as actor_email,
             u.id as actor_id, u.role as actor_role,
             null as assignment_id, vv.client_id as client_id,
             coalesce(rt.name, rt2.name) as type_name,
             v.title as detail, 0 as unread
      from video_views vv
      join users u on u.id = vv.client_id
      join videos v on v.id = vv.video_id
      left join stages s on s.id = v.stage_id
      left join rehab_types rt on rt.id = s.rehab_type_id
      left join rehab_types rt2 on rt2.id = v.rehab_type_id
    )
    order by ts desc
    limit ?
  `).all(limit)
}
