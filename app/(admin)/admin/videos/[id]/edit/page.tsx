import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'
import VideoEditTabs from './VideoEditTabs'

export default async function VideoEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const { tab } = await searchParams

  const db = getDb()
  const video = db.prepare(`
    select v.*,
           s.name as stage_name,
           rt_via_stage.name as stage_type_name,
           rt.name as type_name
    from videos v
    left join stages s on s.id = v.stage_id
    left join rehab_types rt_via_stage on rt_via_stage.id = s.rehab_type_id
    left join rehab_types rt on rt.id = v.rehab_type_id
    where v.id = ?
  `).get(id) as any

  if (!video) notFound()

  const frames = db.prepare(`
    select slot, captured_at from video_frames where video_id = ? order by slot
  `).all(id) as { slot: number; captured_at: string }[]

  const location = video.stage_id
    ? `${video.stage_type_name} → ${video.stage_name}`
    : `${video.type_name} (intro)`

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-4">
      <div>
        <nav className="text-xs text-neutral-500 flex items-center gap-1" aria-label="Breadcrumb">
          <Link href="/admin/videos" className="hover:text-neutral-700 dark:hover:text-neutral-200 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Videos
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-neutral-700 dark:text-neutral-200 font-medium truncate">
            {video.title}
          </span>
        </nav>
        <h1 className="text-2xl font-bold mt-1">{video.title}</h1>
        <p className="text-sm text-neutral-500">{location}</p>
      </div>

      <VideoEditTabs
        video={video}
        initialTab={tab || 'details'}
        initialFrames={frames}
      />
    </div>
  )
}
