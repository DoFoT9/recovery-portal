import { getDb } from '@/lib/db'
import { VideoUploader } from '@/components/admin/VideoUploader'

export default async function UploadPage() {
  const db = getDb()
  const rehabTypes = db.prepare("select id, name from rehab_types order by order_index, name").all() as any[]
  const stages = db.prepare(`
    select s.id, s.name, rt.name as type_name
    from stages s join rehab_types rt on rt.id = s.rehab_type_id
    order by rt.order_index, s.order_index
  `).all() as any[]

  return (
    <div className="max-w-5xl p-4 lg:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Upload Video</h1>
      <p className="text-sm text-neutral-500">
        Upload pre-converted MP4 files. Attach the video either to a specific <strong>Stage</strong>
        or to a <strong>Rehab Type</strong> as a type-level intro.
      </p>
      <VideoUploader rehabTypes={rehabTypes} stages={stages} />
    </div>
  )
}
