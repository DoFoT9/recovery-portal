import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { VideoCard } from '@/components/client/VideoCard'
import { CommentsThread } from '@/components/client/CommentsThread'
import { MarkCompleteButton } from '@/components/client/MarkCompleteButton'
import { MilestoneList } from '@/components/client/MilestoneList'
import { ProgrammePdfDownloadButton } from '@/components/client/ProgrammePdfDownloadButton'
import {
  getCombinedAssignmentProgress,
  listClientMilestonesForStage,
} from '@/lib/milestones'
import { resolveExerciseMetadata } from '@/lib/exercise'

export default async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const db = getDb()

  const assignment = db.prepare(`
    select ca.*, rt.name as type_name, rt.color as type_color, s.name as stage_name
    from client_assignments ca
    join rehab_types rt on rt.id = ca.rehab_type_id
    left join stages s on s.id = ca.stage_id
    where ca.id = ?
  `).get(id) as any

  if (!assignment) notFound()
  if (assignment.client_id !== user.id && user.role !== 'admin') notFound()

  type StageBlock = {
    stage_id: string | null
    stage_name: string | null
    milestones: any[]
    videos: any[]
  }
  const blocks: StageBlock[] = []

  function loadVideosForStage(stageId: string) {
    return db.prepare(
      "select v.*, case when vv.id is null then 0 else 1 end as watched from videos v left join video_views vv on vv.video_id=v.id and vv.client_id=? where v.stage_id=? and v.status='ready' order by v.created_at"
    ).all(user.id, stageId) as any[]
  }

  if (assignment.stage_id) {
    blocks.push({
      stage_id: assignment.stage_id,
      stage_name: assignment.stage_name,
      milestones: listClientMilestonesForStage(user.id, assignment.stage_id) as any[],
      videos: loadVideosForStage(assignment.stage_id),
    })
  } else {
    const intros = db.prepare(
      "select v.*, case when vv.id is null then 0 else 1 end as watched from videos v left join video_views vv on vv.video_id=v.id and vv.client_id=? where v.rehab_type_id=? and v.stage_id is null and v.status='ready' order by v.created_at"
    ).all(user.id, assignment.rehab_type_id) as any[]
    if (intros.length) {
      blocks.push({ stage_id: null, stage_name: 'Introduction', milestones: [], videos: intros })
    }
    const stages = db.prepare(
      "select id, name from stages where rehab_type_id=? order by order_index"
    ).all(assignment.rehab_type_id) as any[]
    for (const s of stages) {
      blocks.push({
        stage_id: s.id,
        stage_name: s.name,
        milestones: listClientMilestonesForStage(user.id, s.id) as any[],
        videos: loadVideosForStage(s.id),
      })
    }
  }

  const progress = getCombinedAssignmentProgress(assignment.id)
  const isAdminViewing = user.role === 'admin' && assignment.client_id !== user.id

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
      {/* v7.4.5.1: if an admin landed here (e.g. via a notification), point them back to where the PDF tools live */}
      {isAdminViewing && (
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 text-sm">
          <p className="text-blue-800 dark:text-blue-200">
            You're viewing this client's assignment as an admin. PDF tools (download, email, title override) live in the{' '}
            <Link href={`/admin/clients/${assignment.client_id}?tab=assignments`} className="underline font-medium inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> client's Assignments tab
            </Link>.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: assignment.type_color }} />
          <h1 className="text-2xl font-bold">{assignment.type_name}</h1>
        </div>
        <p className="text-sm text-neutral-500">{assignment.stage_name || 'Whole programme'}</p>
        <div className="flex items-center gap-3">
          <StatusBadge status={assignment.status} />
          <div className="flex-1">
            <ProgressBar percent={progress.percent} label={`${progress.done} / ${progress.total}`} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <MarkCompleteButton assignmentId={assignment.id} status={assignment.status} />
          {/* Only the actual client owner sees the download button - admins use the toolbar in AssignmentManager */}
          {!isAdminViewing && (
            <ProgrammePdfDownloadButton assignmentId={assignment.id} />
          )}
        </div>
      </div>

      {assignment.admin_recommendations && (
        <div className="card">
          <h2 className="font-semibold mb-2">Clinician recommendations</h2>
          <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
            {assignment.admin_recommendations}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {blocks.length === 0 && (
          <p className="text-sm text-neutral-500">No content yet for this assignment.</p>
        )}
        {blocks.map((b, i) => (
          <section key={i} className="space-y-3">
            {b.stage_name && (
              <h2 className="font-semibold text-lg">{b.stage_name}</h2>
            )}
            {b.milestones.length > 0 && (
              <MilestoneList milestones={b.milestones} />
            )}
            {b.videos.length > 0 && (
              <div>
                {b.milestones.length > 0 && (
                  <h3 className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Videos</h3>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {b.videos.map(v => (
                    <VideoCard
                      key={v.id}
                      video={v}
                      assignmentId={assignment.id}
                      watched={!!v.watched}
                      exerciseMetadata={resolveExerciseMetadata(v, assignment)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      <CommentsThread
        assignmentId={assignment.id}
        currentUserId={user.id}
        currentUserRole={user.role}
      />
    </div>
  )
}
