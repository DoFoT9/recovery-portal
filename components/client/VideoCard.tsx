'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PlayCircle, CheckCircle2 } from 'lucide-react'
import { ExerciseChip } from '@/components/client/ExerciseChip'
import type { ExerciseMetadata } from '@/lib/exercise'

interface VideoCardProps {
  video: any
  assignmentId?: string
  watched?: boolean
  exerciseMetadata?: ExerciseMetadata | null
}

export function VideoCard({
  video,
  assignmentId,
  watched,
  exerciseMetadata,
}: VideoCardProps) {
  const href = assignmentId
    ? `/video/${video.id}?a=${assignmentId}`
    : `/video/${video.id}`

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [ready, setReady] = useState(false)
  const [errored, setErrored] = useState(false)

  // Seek a hair into the video to capture a real preview frame.
  // Seeking + waiting for "seeked" gives us a paint without playback.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onLoaded = () => {
      try {
        const duration = isFinite(el.duration) ? el.duration : 0
        const target = duration > 0 ? Math.min(0.5, duration * 0.1) : 0.5
        el.currentTime = target
      } catch {
        /* some browsers fuss about negative/0 — ignore */
      }
    }
    const onSeeked = () => setReady(true)
    const onError = () => setErrored(true)

    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('error', onError)

    return () => {
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('error', onError)
    }
  }, [video.id])

  return (
    <Link
      href={href}
      className="card hover:shadow-md transition block overflow-hidden !p-0 group"
    >
      <div className="aspect-video bg-neutral-900 relative overflow-hidden">
        {!errored && (
          <video
            ref={videoRef}
            src={`/api/media/videos/${video.id}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            // poster is intentionally absent — we generate the frame ourselves
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              ready ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Subtle dark wash to keep the play icon legible */}
        <div className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/30 transition">
          <PlayCircle
            className="h-14 w-14 text-white drop-shadow-lg"
            strokeWidth={1.5}
          />
        </div>

        {watched && (
          <span
            className="absolute top-2 right-2 bg-green-500/95 text-white rounded-full p-1 shadow"
            title="Watched"
            aria-label="Watched"
          >
            <CheckCircle2 className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold line-clamp-1">{video.title}</h3>
        {video.description && (
          <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
            {video.description}
          </p>
        )}
        {exerciseMetadata && (
          <div className="mt-2">
            <ExerciseChip metadata={exerciseMetadata} />
          </div>
        )}
      </div>
    </Link>
  )
}
