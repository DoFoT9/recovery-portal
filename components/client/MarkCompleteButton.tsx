'use client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'

export function MarkCompleteButton({
  assignmentId, status,
}: { assignmentId: string, status: string }) {
  const router = useRouter()

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-5 w-5" />
        Marked complete — your clinician can reopen if needed.
      </div>
    )
  }

  async function complete() {
    if (!confirm('Mark this assignment complete?')) return
    const res = await fetch(`/api/assignments/${assignmentId}/complete`, { method: 'POST' })
    if (res.ok) {
      toast.success('Marked complete')
      router.refresh()
    } else {
      toast.error('Failed')
    }
  }

  return (
    <button onClick={complete} className="btn-primary">
      <CheckCircle2 className="h-4 w-4" /> Mark Complete
    </button>
  )
}
