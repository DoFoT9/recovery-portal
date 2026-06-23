import Link from 'next/link'
import { getDb } from '@/lib/db'
import { VideoRow } from '@/components/admin/VideoRow'

export default async function VideosPage() {
  const db = getDb()
  const videos = db.prepare(`
    select v.*,
           s.name as stage_name,
           rt_via_stage.name as stage_type_name,
           rt.name as type_name
    from videos v
    left join stages s on s.id = v.stage_id
    left join rehab_types rt_via_stage on rt_via_stage.id = s.rehab_type_id
    left join rehab_types rt on rt.id = v.rehab_type_id
    where v.status != 'archived'
    order by v.created_at desc
  `).all() as any[]

  return (
    <div className="max-w-5xl p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Videos</h1>
        <Link href="/admin/videos/upload" className="btn-primary">Upload</Link>
      </div>
      <div className="card divide-y divide-neutral-200 dark:divide-neutral-800">
        {videos.length === 0 && <p className="text-sm text-neutral-500 py-4">No videos yet.</p>}
        {videos.map(v => <VideoRow key={v.id} video={v} />)}
      </div>
    </div>
  )
}
