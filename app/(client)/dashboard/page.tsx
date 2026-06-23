import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { EmptyState } from '@/components/shared/EmptyState'
import { AssignmentCard } from '@/components/client/AssignmentCard'
import { getCombinedAssignmentProgress } from '@/lib/milestones'
import { firstNameOf } from '@/lib/utils'

export default async function Dashboard() {
  const user = await requireUser()
  const firstName = firstNameOf(user.full_name, user.email)
  const db = getDb()
  const assignments = db.prepare(`
    select ca.id, ca.status, ca.rehab_type_id, ca.stage_id,
           rt.name as type_name, rt.color as type_color,
           s.name as stage_name
    from client_assignments ca
    join rehab_types rt on rt.id = ca.rehab_type_id
    left join stages s on s.id = ca.stage_id
    where ca.client_id = ?
    order by ca.assigned_at desc
  `).all(user.id) as any[]

  const enriched = assignments.map(a => ({
    ...a,
    progress: getCombinedAssignmentProgress(a.id),
  }))

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Welcome back, {firstName} 👋</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Here is what is next on your recovery plan.
        </p>
      </div>

      {enriched.length === 0 ? (
        <EmptyState
          title="No plan assigned yet"
          message="Your clinician hasn't assigned anything yet. Check back soon."
        />
      ) : (
        <>
          <h2 className="text-lg font-semibold">Your Recovery Plan</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enriched.map(a => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        </>
      )}
    </div>
  )
}
