import Link from 'next/link'
import { getDb } from '@/lib/db'
import { notFound } from 'next/navigation'
import { VideoListActions } from '@/components/admin/VideoListActions'

export default async function RehabTypeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const type = db.prepare("select * from rehab_types where id=?").get(id) as any
  if (!type) notFound()
  const stages = db.prepare("select * from stages where rehab_type_id=? order by order_index").all(id) as any[]
  const introVideos = db.prepare(
    "select * from videos where rehab_type_id=? and stage_id is null and status='ready' order by created_at"
  ).all(id) as any[]

  return (
    <div className="max-w-5xl p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 rounded-full" style={{ background: type.color }} />
        <h1 className="text-2xl font-bold">{type.name}</h1>
      </div>
      {type.description && <p className="text-sm text-neutral-500">{type.description}</p>}
      <Link href={`/admin/videos/upload`} className="btn-primary inline-flex">+ Upload video</Link>

      <div className="card">
        <h2 className="font-semibold mb-3">Stages</h2>
        {stages.length === 0 ? (
          <p className="text-sm text-neutral-500">No stages yet. Add some on the <Link href="/admin/rehab-types" className="text-brand hover:underline">tree page</Link>.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {stages.map(s => (
              <li key={s.id} className="py-2">
                <Link href={`/admin/stages/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                {s.description && (<p className="text-xs text-neutral-500">{s.description}</p>)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Intro / type-level videos</h2>
        {introVideos.length === 0 ? (
          <p className="text-sm text-neutral-500">None yet. Upload one and attach it to this rehab type (not a stage).</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {introVideos.map(v => (
              <li key={v.id} className="py-2 flex items-center justify-between">
                <span>{v.title}</span>
                <VideoListActions videoId={v.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
