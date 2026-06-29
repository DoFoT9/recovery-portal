'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { ExerciseChip } from '@/components/client/ExerciseChip'
import { resolveExerciseMetadata } from '@/lib/exercise'
import { VideoListActions } from '@/components/admin/VideoListActions'

export function VideoRow({ video }: { video: any }) {
  const metadata = resolveExerciseMetadata(video, null)
  const location = video.stage_id
    ? `${video.stage_type_name} → ${video.stage_name}`
    : `${video.type_name} (intro)`

  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium truncate">{video.title}</p>
        <p className="text-xs text-neutral-500">
          {location} · {Math.round((video.size_bytes || 0) / 1024 / 1024)} MB
        </p>
        <ExerciseChip metadata={metadata} />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href={`/admin/videos/${video.id}/edit`}
          className="btn-secondary !p-2"
          title="Edit details, notes and frames"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <VideoListActions videoId={video.id} />
      </div>
    </div>
  )
}
