'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function CreateClientForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fd.get('email'),
        fullName: fd.get('fullName'),
        password: fd.get('password'),
        role: 'client',
      }),
    })
    setBusy(false)
    if (res.ok) {
      toast.success('Client created')
      setOpen(false)
      router.refresh()
    } else {
      toast.error((await res.json()).error || 'Failed')
    }
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn-primary">+ Add Client</button>
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <input name="fullName" className="input" placeholder="Full name" />
      <input name="email" type="email" className="input" placeholder="email@example.com" required />
      <input name="password" type="password" className="input" placeholder="Temporary password" required />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  )
}
