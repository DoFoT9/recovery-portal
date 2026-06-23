'use client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'

export function AssignmentStatusControl({
  assignmentId, status,
}: { assignmentId: string, status: string }) {
  const router = useRouter()

  async function change(newStatus: string) {
    const res = await fetch(`/api/assignments/${assignmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) { toast.success('Updated'); router.refresh() }
    else toast.error('Failed')
  }

  async function reopen() {
    const res = await fetch(`/api/assignments/${assignmentId}/reopen`, { method: 'POST' })
    if (res.ok) { toast.success('Reopened'); router.refresh() }
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={status}
        onChange={e => change(e.target.value)}
        className="input !w-auto !py-1 !px-2 text-xs"
      >
        <option value="assigned">Not started</option>
        <option value="in_progress">In progress</option>
        <option value="completed">Completed</option>
      </select>
      {status === 'completed' && (
        <button onClick={reopen} className="btn-secondary !p-2" title="Reopen"><RotateCcw className="h-4 w-4" /></button>
      )}
    </div>
  )
}
