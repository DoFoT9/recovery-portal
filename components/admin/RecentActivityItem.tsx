'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { MessageCircle, Reply, CheckCircle2, Sparkles, Film } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

const iconForKind: Record<string, any> = {
  comment:   MessageCircle,
  milestone: CheckCircle2,
  completed: CheckCircle2,
  video:     Film,
}

export function RecentActivityItem({ activity }: { activity: any }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const Icon = iconForKind[activity.kind] || Sparkles

  const isComment = activity.kind === 'comment'
  const isUnread  = isComment && activity.unread === 1

  async function reply(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !activity.assignment_id) return
    setBusy(true)
    const res = await fetch(`/api/assignments/${activity.assignment_id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })
    setBusy(false)
    if (res.ok) {
      await fetch(`/api/assignments/${activity.assignment_id}/seen`, { method: 'POST' })
      toast.success('Reply posted')
      setText(''); setOpen(false)
      router.refresh()
    } else {
      toast.error('Failed to post')
    }
  }

  const accent = isUnread
    ? 'border-l-4 border-brand bg-brand/5 dark:bg-brand/10'
    : 'border-l-2 border-neutral-200 dark:border-neutral-800'

  return (
    <li className={`py-2 pl-3 text-sm ${accent}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-neutral-500 inline-flex items-center gap-1">
          <Icon className="h-3 w-3" /> {activity.kind}
          {isUnread && (
            <span className="ml-1 text-xs bg-brand text-white rounded-full px-1.5 py-0.5">new</span>
          )}
        </span>
        <span className="text-xs text-neutral-500">{timeAgo(activity.ts)}</span>
      </div>
      <div className="text-sm mt-0.5">
        <span className="font-medium">{activity.actor || activity.actor_email}</span>
        {' · '}
        <span className="text-neutral-600 dark:text-neutral-400">{activity.type_name}</span>
      </div>
      {activity.detail && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-0.5">
          {activity.detail}
        </p>
      )}
      {isComment && activity.assignment_id && (
        <div className="mt-2 flex items-center gap-2">
          <Link
            href={`/admin/clients/${activity.client_id}`}
            className="text-xs text-neutral-500 hover:text-brand"
          >
            Open client →
          </Link>
          {!open && (
            <button
              onClick={() => setOpen(true)}
              className="text-xs inline-flex items-center gap-1 text-brand hover:underline"
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
          )}
        </div>
      )}
      {open && (
        <form onSubmit={reply} className="mt-2 space-y-2">
          <textarea
            className="input"
            rows={2}
            placeholder="Quick reply…"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn-primary !py-1 !px-3 text-xs" disabled={busy || !text.trim()}>
              {busy ? 'Sending…' : 'Send'}
            </button>
            <button type="button" className="btn-secondary !py-1 !px-3 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
