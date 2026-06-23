import Link from 'next/link'
import { getDb } from '@/lib/db'
import { notFound } from 'next/navigation'
import { VideoListActions } from '@/components/admin/VideoListActions'
import { MilestonesAdmin } from '@/components/admin/MilestonesAdmin'
import { listMilestonesForStage } from '@/lib/milestones'

export default async function StageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const stage = db.prepare(`
    select s.*, rt.name as type_name, rt.color as type_color, rt.id as type_id
    from stages s join rehab_types rt on rt.id = s.rehab_type_id
    where s.id=?
  `).get(id) as any
  if (!stage) notFound()

  const videos = db.prepare(
    "select * from videos where stage_id=? and status='ready' order by created_at"
  ).all(id) as any[]
  const milestones = listMilestonesForStage(id) as any[]

  return (
    <div className="max-w-5xl p-4 lg:p-6 space-y-6">
      <div className="text-sm text-neutral-500">
        <Link href={`/admin/rehab-types/${stage.type_id}`} className="hover:underline">{stage.type_name}</Link> /
      </div>
      <h1 className="text-2xl font-bold">{stage.name}</h1>
      {stage.description && <p className="text-sm text-neutral-500">{stage.description}</p>}

      <MilestonesAdmin stageId={id} initial={milestones} />

      <div className="card">
        <h2 className="font-semibold mb-3">Videos</h2>
        {videos.length === 0 ? (
          <p className="text-sm text-neutral-500">No videos yet for this stage.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {videos.map(v => (
              <li key={v.id} className="py-2 flex items-center justify-between">
                <span>{v.title}</span>
                <VideoListActions videoId={v.id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/admin/videos/upload" className="btn-primary inline-flex">+ Upload video to this stage</Link>
    </div>
  )
}
