'use client'
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { ExerciseChip } from '@/components/client/ExerciseChip'
import { resolveExerciseMetadata } from '@/lib/exercise'
import { VideoListActions } from '@/components/admin/VideoListActions'
import { VideoMetadataEditor } from '@/components/admin/VideoMetadataEditor'

export function VideoRow({ video }: { video: any }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="py-3">
        <VideoMetadataEditor
          video={video}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </div>
    )
  }

  const metadata = resolveExerciseMetadata(video, null)
  const location = video.stage_id
    ? `${video.stage_type_name} → ${video.stage_name}`
    : `${video.type_name} (intro)`

  return (
    <div className="py-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="font-medium truncate flex items-center gap-2 flex-wrap">
          {video.title}
          <ExerciseChip metadata={metadata} />
        </div>
        <div className="text-xs text-neutral-500">
          {location}
          {' · '}{Math.round((video.size_bytes || 0) / 1024 / 1024)} MB
        </div>
      </div>
      <button onClick={() => setEditing(true)} className="btn-secondary !p-2" title="Edit details">
        <Pencil className="h-4 w-4" />
      </button>
      <VideoListActions videoId={video.id} />
    </div>
  )
}
