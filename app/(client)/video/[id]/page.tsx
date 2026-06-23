import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { canUserAccessVideo } from '@/lib/access'
import { VideoPlayer } from '@/components/client/VideoPlayer'
import { ExercisePrescription } from '@/components/client/ExercisePrescription'
import { resolveExerciseMetadata } from '@/lib/exercise'
import { notFound } from 'next/navigation'

export default async function VideoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ a?: string }>,
}) {
  const user = await requireUser()
  const { id } = await params
  const { a: assignmentId } = await searchParams

  if (!canUserAccessVideo(user, id)) notFound()

  const db = getDb()
  const video = db.prepare("select * from videos where id=? and status='ready'").get(id) as any
  if (!video) notFound()

  let assignment: any = null
  let validAssignmentId: string | undefined
  if (assignmentId) {
    assignment = db.prepare(
      "select * from client_assignments where id=? and client_id=?"
    ).get(assignmentId, user.id)
    if (assignment || user.role === 'admin') validAssignmentId = assignmentId
    if (!assignment && user.role === 'admin') {
      assignment = db.prepare("select * from client_assignments where id=?").get(assignmentId)
    }
  }

  const metadata = resolveExerciseMetadata(video, assignment)

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-4">
      <h1 className="text-xl font-bold">{video.title}</h1>
      <VideoPlayer
        src={`/api/media/videos/${video.id}`}
        videoId={video.id}
        assignmentId={validAssignmentId}
      />
      {video.description && (
        <p className="text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">
          {video.description}
        </p>
      )}
      <ExercisePrescription metadata={metadata} />
    </div>
  )
}
