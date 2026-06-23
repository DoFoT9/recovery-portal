import { getDb } from '@/lib/db'
import { RehabTypeTree } from '@/components/admin/RehabTypeTree'

export default async function RehabTypesPage() {
  const db = getDb()
  const types = db.prepare("select * from rehab_types order by order_index, name").all() as any[]
  const stages = db.prepare("select * from stages order by rehab_type_id, order_index").all() as any[]

  const stageVideoCounts = db.prepare(
    "select stage_id, count(*) c from videos where stage_id is not null and status='ready' group by stage_id"
  ).all() as any[]
  const typeVideoCounts = db.prepare(
    "select rehab_type_id, count(*) c from videos where stage_id is null and rehab_type_id is not null and status='ready' group by rehab_type_id"
  ).all() as any[]

  const stageMap: Record<string, number> = {}
  stageVideoCounts.forEach((r: any) => { stageMap[r.stage_id] = r.c })
  const typeMap: Record<string, number> = {}
  typeVideoCounts.forEach((r: any) => { typeMap[r.rehab_type_id] = r.c })

  const enriched = types.map(t => ({
    ...t,
    videoCount: typeMap[t.id] || 0,
    stages: stages
      .filter(s => s.rehab_type_id === t.id)
      .map(s => ({ ...s, videoCount: stageMap[s.id] || 0 })),
  }))

  return (
    <div className="max-w-5xl p-4 lg:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Rehab Types</h1>
      <p className="text-sm text-neutral-500">
        Drag and drop to reorder. Click into a stage to manage its milestones and videos.
      </p>
      <RehabTypeTree initial={enriched} />
    </div>
  )
}
