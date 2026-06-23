import Link from 'next/link'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ProgressBar } from '@/components/shared/ProgressBar'

export function AssignmentCard({ assignment }: { assignment: any }) {
  const p = assignment.progress || { percent: 0, done: 0, total: 0 }
  return (
    <Link href={`/assignment/${assignment.id}`} className="card hover:shadow-md transition block space-y-3">
      <div className="flex items-start gap-2">
        <span className="h-3 w-3 mt-1 rounded-full flex-shrink-0" style={{ background: assignment.type_color }} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{assignment.type_name}</h3>
          <p className="text-xs text-neutral-500 truncate">
            {assignment.stage_name || 'Whole programme'}
          </p>
        </div>
      </div>
      <StatusBadge status={assignment.status} />
      <ProgressBar percent={p.percent} label={p.total > 0 ? `${p.done} / ${p.total}` : 'No tasks yet'} />
    </Link>
  )
}
