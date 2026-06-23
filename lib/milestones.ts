import { getDb, id } from '@/lib/db'

export function listMilestonesForStage(stageId: string) {
  return getDb().prepare(
    "select * from milestones where stage_id=? order by order_index, created_at"
  ).all(stageId)
}

export function listClientMilestonesForStage(clientId: string, stageId: string) {
  return getDb().prepare(`
    select m.*, cm.completed_at, cm.source,
           case when cm.id is null then 0 else 1 end as completed
    from milestones m
    left join client_milestones cm on cm.milestone_id = m.id and cm.client_id = ?
    where m.stage_id = ?
    order by m.order_index, m.created_at
  `).all(clientId, stageId)
}

export function listVideoViewsForStage(clientId: string, stageId: string) {
  return getDb().prepare(`
    select v.id as video_id, v.title, vv.watched_at,
           case when vv.id is null then 0 else 1 end as watched
    from videos v
    left join video_views vv on vv.video_id = v.id and vv.client_id = ?
    where v.stage_id = ? and v.status='ready'
    order by v.created_at
  `).all(clientId, stageId)
}

export function getCombinedStageProgress(clientId: string, stageId: string) {
  const db = getDb()
  const mTotal = (db.prepare("select count(*) c from milestones where stage_id=?").get(stageId) as any).c
  const mDone = (db.prepare(`
    select count(*) c from client_milestones cm
    join milestones m on m.id = cm.milestone_id
    where cm.client_id=? and m.stage_id=?
  `).get(clientId, stageId) as any).c
  const vTotal = (db.prepare("select count(*) c from videos where stage_id=? and status='ready'").get(stageId) as any).c
  const vDone = (db.prepare(`
    select count(*) c from video_views vv
    join videos v on v.id = vv.video_id
    where vv.client_id=? and v.stage_id=? and v.status='ready'
  `).get(clientId, stageId) as any).c

  const total = mTotal + vTotal
  const done  = mDone + vDone
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return {
    totalMilestones: mTotal, completedMilestones: mDone,
    totalVideos: vTotal,    watchedVideos: vDone,
    total, done, percent,
  }
}

export function getCombinedAssignmentProgress(assignmentId: string) {
  const db = getDb()
  const a = db.prepare("select * from client_assignments where id=?").get(assignmentId) as any
  if (!a) return { percent: 0, total: 0, done: 0, totalMilestones: 0, completedMilestones: 0, totalVideos: 0, watchedVideos: 0 }

  if (a.stage_id) {
    return getCombinedStageProgress(a.client_id, a.stage_id)
  }

  const stageIds = (db.prepare("select id from stages where rehab_type_id=?").all(a.rehab_type_id) as any[])
    .map(r => r.id)

  let mTotal = 0, mDone = 0, vTotal = 0, vDone = 0
  for (const sid of stageIds) {
    const sp = getCombinedStageProgress(a.client_id, sid)
    mTotal += sp.totalMilestones
    mDone  += sp.completedMilestones
    vTotal += sp.totalVideos
    vDone  += sp.watchedVideos
  }

  const introTotal = (db.prepare(
    "select count(*) c from videos where rehab_type_id=? and stage_id is null and status='ready'"
  ).get(a.rehab_type_id) as any).c
  const introDone = (db.prepare(`
    select count(*) c from video_views vv
    join videos v on v.id = vv.video_id
    where vv.client_id=? and v.rehab_type_id=? and v.stage_id is null and v.status='ready'
  `).get(a.client_id, a.rehab_type_id) as any).c
  vTotal += introTotal
  vDone  += introDone

  const total = mTotal + vTotal
  const done  = mDone + vDone
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return {
    totalMilestones: mTotal, completedMilestones: mDone,
    totalVideos: vTotal,    watchedVideos: vDone,
    total, done, percent,
  }
}

export function tickMilestone(clientId: string, milestoneId: string, source: 'manual' | 'video_view' = 'manual') {
  const db = getDb()
  try {
    db.prepare(
      "insert into client_milestones (id, client_id, milestone_id, source) values (?, ?, ?, ?)"
    ).run(id(), clientId, milestoneId, source)
    return true
  } catch {
    return false
  }
}

export function untickMilestone(clientId: string, milestoneId: string) {
  getDb().prepare("delete from client_milestones where client_id=? and milestone_id=?")
    .run(clientId, milestoneId)
}

export function markVideoViewed(clientId: string, videoId: string) {
  const db = getDb()
  try {
    db.prepare("insert into video_views (id, client_id, video_id) values (?, ?, ?)")
      .run(id(), clientId, videoId)
    return true
  } catch {
    return false
  }
}

export function addMilestone(stageId: string, title: string) {
  const db = getDb()
  const max = (db.prepare("select coalesce(max(order_index), 0) m from milestones where stage_id=?").get(stageId) as any).m
  const newId = id()
  db.prepare("insert into milestones (id, stage_id, title, order_index, is_default) values (?, ?, ?, ?, 0)")
    .run(newId, stageId, title, max + 1)
  return newId
}

export function updateMilestone(id: string, title: string) {
  getDb().prepare("update milestones set title=? where id=?").run(title, id)
}

export function deleteMilestone(id: string) {
  getDb().prepare("delete from milestones where id=?").run(id)
}

export function reorderMilestones(stageId: string, orderedIds: string[]) {
  const db = getDb()
  const stmt = db.prepare("update milestones set order_index=? where id=? and stage_id=?")
  const tx = db.transaction((ids: string[]) => ids.forEach((mid, i) => stmt.run(i + 1, mid, stageId)))
  tx(orderedIds)
}

export function clearProgressForAssignmentScope(
  clientId: string, rehabTypeId: string, stageId: string | null
): { clearedMilestones: number, clearedVideos: number } {
  const db = getDb()
  let clearedMilestones = 0
  let clearedVideos = 0

  db.transaction(() => {
    if (stageId) {
      const r1 = db.prepare(`
        delete from client_milestones
        where client_id=?
          and milestone_id in (select id from milestones where stage_id=?)
      `).run(clientId, stageId)
      clearedMilestones = r1.changes

      const r2 = db.prepare(`
        delete from video_views
        where client_id=?
          and video_id in (select id from videos where stage_id=?)
      `).run(clientId, stageId)
      clearedVideos = r2.changes
    } else {
      const r1 = db.prepare(`
        delete from client_milestones
        where client_id=?
          and milestone_id in (
            select m.id from milestones m
            join stages s on s.id = m.stage_id
            where s.rehab_type_id=?
          )
      `).run(clientId, rehabTypeId)
      clearedMilestones = r1.changes

      const r2 = db.prepare(`
        delete from video_views
        where client_id=?
          and video_id in (
            select id from videos
            where stage_id in (select id from stages where rehab_type_id=?)
               or (stage_id is null and rehab_type_id=?)
          )
      `).run(clientId, rehabTypeId, rehabTypeId)
      clearedVideos = r2.changes
    }
  })()

  return { clearedMilestones, clearedVideos }
}
