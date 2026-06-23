'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Sparkles } from 'lucide-react'

export function MilestoneList({ milestones }: { milestones: any[] }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  async function toggle(m: any) {
    setPending(m.id)
    const method = m.completed ? 'DELETE' : 'POST'
    const res = await fetch(`/api/milestones/${m.id}/tick`, { method })
    setPending(null)
    if (res.ok) {
      router.refresh()
    } else {
      toast.error('Failed')
    }
  }

  return (
    <ul className="card divide-y divide-neutral-200 dark:divide-neutral-800">
      {milestones.map(m => (
        <li key={m.id}>
          <button
            onClick={() => toggle(m)}
            disabled={pending === m.id}
            className="w-full py-2.5 flex items-center gap-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 -mx-4 px-4 transition"
          >
            {m.completed
              ? <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              : <Circle className="h-5 w-5 text-neutral-400 flex-shrink-0" />}
            <span className={`flex-1 text-sm ${m.completed ? 'text-neutral-500 line-through' : ''}`}>
              {m.title}
            </span>
            {m.source === 'video_view' && (
              <span className="text-xs text-neutral-500 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> auto
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
