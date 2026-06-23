'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Save, X, GripVertical } from 'lucide-react'

export function MilestonesAdmin({
  stageId, initial,
}: { stageId: string, initial: any[] }) {
  const router = useRouter()
  const [items, setItems] = useState<any[]>(initial)
  const [newTitle, setNewTitle] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  async function add() {
    if (!newTitle.trim()) return
    const res = await fetch(`/api/stages/${stageId}/milestones`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    if (res.ok) { toast.success('Added'); setNewTitle(''); router.refresh() }
    else toast.error('Failed')
  }

  async function save(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await fetch(`/api/milestones/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: fd.get('title') }),
    })
    if (res.ok) { toast.success('Saved'); setEditId(null); router.refresh() }
  }

  async function del(id: string) {
    if (!confirm('Delete milestone?')) return
    const res = await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); router.refresh() }
  }

  function onDragStart(id: string) { setDragId(id) }

  async function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); return }
    const ids = items.map(m => m.id)
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId)
    if (from < 0 || to < 0) { setDragId(null); return }
    const newItems = [...items]
    const [moved] = newItems.splice(from, 1)
    newItems.splice(to, 0, moved)
    setItems(newItems)
    setDragId(null)
    const res = await fetch(`/api/stages/${stageId}/milestones/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: newItems.map(m => m.id) }),
    })
    if (res.ok) toast.success('Reordered')
    else router.refresh()
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Milestones</h2>
      <p className="text-xs text-neutral-500">
        Clients tick these off as they go. The default <em>Mark this stage as done</em> milestone is added automatically.
      </p>

      <div className="flex gap-2">
        <input className="input" placeholder="New milestone (e.g. Range of motion ≥ 90°)"
          value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button className="btn-primary" onClick={add}><Plus className="h-4 w-4" /> Add</button>
      </div>

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {items.length === 0 && (
          <li className="text-sm text-neutral-500 py-2">No milestones yet.</li>
        )}
        {items.map(m => (
          <li
            key={m.id}
            className="py-2"
            draggable
            onDragStart={() => onDragStart(m.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(m.id)}
          >
            {editId === m.id ? (
              <form onSubmit={e => save(e, m.id)} className="flex gap-2">
                <input name="title" defaultValue={m.title} className="input" required />
                <button className="btn-primary"><Save className="h-4 w-4" /></button>
                <button type="button" onClick={() => setEditId(null)} className="btn-secondary"><X className="h-4 w-4" /></button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-neutral-400 cursor-move" />
                <span className="flex-1 text-sm">{m.title}</span>
                {m.is_default === 1 && (
                  <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">default</span>
                )}
                <button onClick={() => setEditId(m.id)} className="btn-secondary !p-1.5"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(m.id)} className="btn-danger !p-1.5"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
