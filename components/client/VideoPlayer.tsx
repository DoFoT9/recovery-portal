'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function VideoPlayer({
  src, videoId, assignmentId,
}: { src: string, videoId: string, assignmentId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewedRef = useRef(false)
  const playedSecRef = useRef(0)

  useEffect(() => {
    if (assignmentId) {
      fetch(`/api/assignments/${assignmentId}/touch`, { method: 'POST' }).catch(() => {})
    }
  }, [assignmentId])

  function onTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (viewedRef.current) return
    playedSecRef.current = e.currentTarget.currentTime
    if (playedSecRef.current >= 5) {
      viewedRef.current = true
      fetch(`/api/videos/${videoId}/view`, { method: 'POST' }).catch(() => {})
    }
  }

  const back = assignmentId ? `/assignment/${assignmentId}` : '/dashboard'

  return (
    <div className="space-y-3">
      <Link href={back} className="btn-secondary !py-1.5 !px-3 w-fit">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onTimeUpdate={onTimeUpdate}
        className="w-full rounded-xl bg-black aspect-video"
      />
    </div>
  )
}
