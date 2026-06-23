'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Plus, Pencil, Trash2, ChevronRight, ChevronDown,
  Save, X, GripVertical, Film,
} from 'lucide-react'

export function RehabTypeTree({ initial }: { initial: any[] }) {
  const router = useRouter()
  const [items, setItems] = useState<any[]>(initial)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editType, setEditType] = useState<string | null>(null)
  const [editStage, setEditStage] = useState<string | null>(null)
  const [newTypeName, setNewTypeName] = useState('')

  function toggle(id: string) { setExpanded(s => ({ ...s, [id]: !s[id] })) }

  type DragRef = { kind: 'type' | 'stage', id: string, parentId?: string }
  const [drag, setDrag] = useState<DragRef | null>(null)

  function onDragStart(d: DragRef) { setDrag(d) }

  async function onDropType(targetId: string) {
    if (!drag || drag.kind !== 'type' || drag.id === targetId) { setDrag(null); return }
    const ids = items.map(t => t.id)
    const from = ids.indexOf(drag.id)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) { setDrag(null); return }
    const newItems = [...items]
    const [moved] = newItems.splice(from, 1)
    newItems.splice(to, 0, moved)
    setItems(newItems)
    setDrag(null)
    const res = await fetch('/api/rehab-types/reorder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: newItems.map(t => t.id) }),
    })
    if (res.ok) toast.success('Reordered')
    else { toast.error('Reorder failed'); router.refresh() }
  }

  async function onDropStage(targetTypeId: string, targetStageId: string) {
    if (!drag || drag.kind !== 'stage' || drag.parentId !== targetTypeId) { setDrag(null); return }
    if (drag.id === targetStageId) { setDrag(null); return }
    const t = items.find(x => x.id === targetTypeId); if (!t) return
    const ids = t.stages.map((s: any) => s.id)
    const from = ids.indexOf(drag.id), to = ids.indexOf(targetStageId)
    if (from < 0 || to < 0) { setDrag(null); return }
    const newStages = [...t.stages]
    const [moved] = newStages.splice(from, 1)
    newStages.splice(to, 0, moved)
    const newItems = items.map(x => x.id === targetTypeId ? { ...x, stages: newStages } : x)
    setItems(newItems)
    setDrag(null)
    const res = await fetch('/api/stages/reorder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rehabTypeId: targetTypeId, orderedIds: newStages.map((s: any) => s.id) }),
    })
    if (res.ok) toast.success('Reordered')
    else { toast.error('Reorder failed'); router.refresh() }
  }

  async function createType(e: React.FormEvent) {
    e.preventDefault()
    if (!newTypeName.trim()) return
    const res = await fetch('/api/rehab-types', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTypeName, color: '#6366f1' }),
    })
    if (res.ok) { toast.success('Created'); setNewTypeName(''); router.refresh() }
    else toast.error('Failed')
  }

  async function saveType(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/rehab-types', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: fd.get('name'), description: fd.get('description'), color: fd.get('color') }),
    })
    if (res.ok) { toast.success('Saved'); setEditType(null); router.refresh() }
    else toast.error('Failed')
  }

  async function delType(id: string) {
    if (!confirm('Delete this rehab type? All stages, videos and assignments under it will be removed.')) return
    const res = await fetch('/api/rehab-types', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) { toast.success('Deleted'); router.refresh() }
  }

  async function addStage(rehabTypeId: string) {
    const name = prompt('New stage name:')
    if (!name?.trim()) return
    const res = await fetch('/api/stages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rehab_type_id: rehabTypeId, name }),
    })
    if (res.ok) { toast.success('Stage added'); router.refresh() }
  }

  async function saveStage(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/stages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: fd.get('name'), description: fd.get('description') }),
    })
    if (res.ok) { toast.success('Saved'); setEditStage(null); router.refresh() }
  }

  async function delStage(id: string) {
    if (!confirm('Delete this stage? Its milestones, videos and assignments will be removed too.')) return
    const res = await fetch('/api/stages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) { toast.success('Deleted'); router.refresh() }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createType} className="card flex gap-2">
        <input className="input" placeholder="New rehab type (e.g. Hip Surgery)"
          value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
        <button className="btn-primary" type="submit"><Plus className="h-4 w-4" /> Add</button>
      </form>

      <div className="card divide-y divide-neutral-200 dark:divide-neutral-800">
        {items.length === 0 && (
          <p className="text-sm text-neutral-500 py-2">No rehab types yet.</p>
        )}
        {items.map(t => (
          <div
            key={t.id}
            className="py-3 space-y-2"
            draggable
            onDragStart={() => onDragStart({ kind: 'type', id: t.id })}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDropType(t.id)}
          >
            {editType === t.id ? (
              <form onSubmit={e => saveType(e, t.id)} className="space-y-2">
                <div className="flex gap-2">
                  <input name="name" defaultValue={t.name} className="input" required />
                  <input name="color" type="color" defaultValue={t.color}
                    className="h-10 w-12 rounded border border-neutral-300 dark:border-neutral-700" />
                </div>
                <textarea name="description" defaultValue={t.description ?? ''} className="input" rows={2}
                  placeholder="Description (optional)" />
                <div className="flex gap-2">
                  <button className="btn-primary" type="submit"><Save className="h-4 w-4" /> Save</button>
                  <button type="button" className="btn-secondary" onClick={() => setEditType(null)}><X className="h-4 w-4" /></button>
                </div>
              </form>
            ) : (
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-neutral-400 mt-1 cursor-move" />
                <button onClick={() => toggle(t.id)} className="text-neutral-500 mt-1">
                  {expanded[t.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <span className="h-3 w-3 mt-1.5 rounded-full" style={{ background: t.color }} />
                <div className="flex-1 min-w-0">
                  <Link href={`/admin/rehab-types/${t.id}`} className="font-semibold hover:underline">{t.name}</Link>
                  {t.description && (<p className="text-xs text-neutral-500">{t.description}</p>)}
                  <p className="text-xs text-neutral-400 flex items-center gap-2 flex-wrap">
                    <span>{t.stages.length} stage(s)</span>
                    {t.videoCount > 0 && (
                      <span className="inline-flex items-center gap-1"><Film className="h-3 w-3" /> {t.videoCount} intro</span>
                    )}
                  </p>
                </div>
                <button onClick={() => addStage(t.id)} className="btn-secondary !py-1 !px-2" title="Add stage"><Plus className="h-4 w-4" /></button>
                <button onClick={() => setEditType(t.id)} className="btn-secondary !py-1 !px-2" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => delType(t.id)} className="btn-danger !py-1 !px-2" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}

            {expanded[t.id] && (
              <ul className="ml-8 space-y-2">
                {t.stages.length === 0 && (
                  <li className="text-xs text-neutral-500">No stages yet — click + to add.</li>
                )}
                {t.stages.map((s: any) => (
                  <li
                    key={s.id}
                    className="border-l border-neutral-200 dark:border-neutral-800 pl-3"
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); onDragStart({ kind: 'stage', id: s.id, parentId: t.id }) }}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                    onDrop={(e) => { e.stopPropagation(); onDropStage(t.id, s.id) }}
                  >
                    {editStage === s.id ? (
                      <form onSubmit={e => saveStage(e, s.id)} className="space-y-2">
                        <input name="name" defaultValue={s.name} className="input" required />
                        <textarea name="description" defaultValue={s.description ?? ''} className="input" rows={2} placeholder="Description" />
                        <div className="flex gap-2">
                          <button className="btn-primary" type="submit"><Save className="h-4 w-4" /></button>
                          <button type="button" className="btn-secondary" onClick={() => setEditStage(null)}><X className="h-4 w-4" /></button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-neutral-400 cursor-move" />
                        <div className="flex-1 min-w-0">
                          <Link href={`/admin/stages/${s.id}`} className="text-sm font-medium hover:underline">{s.name}</Link>
                          {s.description && (<p className="text-xs text-neutral-500">{s.description}</p>)}
                          {s.videoCount > 0 && (
                            <p className="text-xs text-neutral-400 inline-flex items-center gap-1">
                              <Film className="h-3 w-3" /> {s.videoCount} video(s)
                            </p>
                          )}
                        </div>
                        <button onClick={() => setEditStage(s.id)} className="btn-secondary !py-1 !px-2"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => delStage(s.id)} className="btn-danger !py-1 !px-2"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
