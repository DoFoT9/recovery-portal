// components/client/ClientMarkRepliesRead.tsx
//
// v7.5.2 (item 5) — drop this into the client's assignment detail page so that
// simply viewing the conversation clears its unread admin-reply count.
// Mirrors the admin ClientTabs "mark read on open" effect.
//
// Usage (server component app/(client)/assignment/[id]/page.tsx):
//   import { ClientMarkRepliesRead } from '@/components/client/ClientMarkRepliesRead'
//   ...
//   <ClientMarkRepliesRead assignmentId={assignment.id} />

'use client'

import { useEffect, useRef } from 'react'

export function ClientMarkRepliesRead({ assignmentId }: { assignmentId: string }) {
  const doneRef = useRef(false)

  useEffect(() => {
    if (doneRef.current) return
    doneRef.current = true

    fetch('/api/client-inbox/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId }),
    })
      .then(() => {
        // Tell the banner / badge to re-poll immediately so they clear without a reload.
        window.dispatchEvent(new Event('client-inbox:refresh'))
      })
      .catch(() => {})
  }, [assignmentId])

  return null
}
