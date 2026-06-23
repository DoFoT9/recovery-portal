'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { timeAgo } from '@/lib/utils'

export function CommentsThread({
  assignmentId,
  currentUserId,
  currentUserRole,
}: {
  assignmentId: string
  currentUserId: string
  currentUserRole: string
}) {
  const [comments, setComments] = useState<any[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch(`/api/assignments/${assignmentId}/comments`)
    if (res.ok) setComments(await res.json())
  }

  useEffect(() => {
    load()
    // After load, give the sidebar/title a nudge in case viewing this
    // thread cleared unread state server-side.
    window.dispatchEvent(new Event('inbox:refresh'))
    // eslint-disable-next-line
  }, [assignmentId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    const res = await fetch(`/api/assignments/${assignmentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })
    setBusy(false)
    if (res.ok) {
      setText('')
      await load()
      window.dispatchEvent(new Event('inbox:refresh'))
    } else {
      toast.error('Failed to post')
    }
  }

  // Suppress unused-var warning while keeping the prop in the public API
  void currentUserId

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold">Comments &amp; questions</h3>

      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-neutral-500">No comments yet.</p>
        )}
        {comments.map(c => (
          <div
            key={c.id}
            className="border-l-2 border-neutral-200 dark:border-neutral-800 pl-3"
          >
            <div className="text-xs text-neutral-500 flex items-center gap-2">
              <span className="font-medium text-neutral-700 dark:text-neutral-200">
                {c.author_name || c.author_email}
              </span>
              {c.author_role === 'admin' && (
                <span className="text-[10px] uppercase tracking-wide text-brand">
                  clinician
                </span>
              )}
              <span>· {timeAgo(c.created_at)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap mt-1">{c.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-2">
        <textarea
          className="input"
          rows={3}
          placeholder={
            currentUserRole === 'admin'
              ? 'Reply to your client…'
              : 'Ask a question or share a note…'
          }
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button className="btn-primary" disabled={busy || !text.trim()}>
          {busy ? 'Posting…' : 'Post comment'}
        </button>
      </form>
    </div>
  )
}
