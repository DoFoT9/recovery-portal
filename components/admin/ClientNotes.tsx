// components/admin/ClientNotes.tsx
//
// v7.7 — OneNote-style per-client clinician notes.
//
// - Fetches its own notes on mount (so wiring is just <ClientNotes clientId=... />).
// - Left rail: list of notes (pinned first), + New note.
// - Right pane: title + Markdown body editor with Edit / Preview toggle.
// - Autosaves (debounced) as you type; shows "Saving…/Saved".
// - Pin, delete, author attribution + last-updated time.
// - Admin-only (the API enforces it); never shown to clients.
//
// Zero dependencies: includes a small, safe Markdown renderer (escapes HTML first,
// then applies a limited, well-known subset: headings, bold/italic, inline code,
// links (http/https only), bullet + checkbox lists).

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, Pin, PinOff, Trash2, Eye, Pencil, StickyNote, Check,
} from 'lucide-react'

interface Note {
  id: string
  client_id: string
  author_id: string | null
  author_name: string | null
  title: string | null
  body: string
  pinned: number
  created_at: string
  updated_at: string
}

// ---------- tiny safe markdown ------------------------------------------------
function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
function inline(s: string) {
  let t = escapeHtml(s)
  // links [text](http/https url)
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand underline">$1</a>')
  // bold, italic, inline code
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  t = t.replace(/`([^`]+)`/g, '<code class="px-1 rounded bg-neutral-100 dark:bg-neutral-800">$1</code>')
  return t
}
function renderMarkdown(md: string): string {
  const lines = (md || '').split(/\r?\n/)
  const out: string[] = []
  let inUl = false
  const closeUl = () => { if (inUl) { out.push('</ul>'); inUl = false } }
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (/^###\s+/.test(line)) { closeUl(); out.push(`<h3 class="font-semibold mt-3">${inline(line.replace(/^###\s+/, ''))}</h3>`); continue }
    if (/^##\s+/.test(line))  { closeUl(); out.push(`<h2 class="font-bold text-lg mt-3">${inline(line.replace(/^##\s+/, ''))}</h2>`); continue }
    if (/^#\s+/.test(line))   { closeUl(); out.push(`<h1 class="font-bold text-xl mt-3">${inline(line.replace(/^#\s+/, ''))}</h1>`); continue }
    const cb = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/)
    if (cb) {
      if (!inUl) { out.push('<ul class="space-y-1 my-1">'); inUl = true }
      const checked = cb[1].toLowerCase() === 'x'
      out.push(
        `<li class="flex items-start gap-2"><span class="mt-0.5">${checked ? '☑' : '☐'}</span><span>${inline(cb[2])}</span></li>`
      )
      continue
    }
    const li = line.match(/^[-*]\s+(.*)$/)
    if (li) {
      if (!inUl) { out.push('<ul class="list-disc pl-5 space-y-0.5 my-1">'); inUl = true }
      out.push(`<li>${inline(li[1])}</li>`)
      continue
    }
    if (line.trim() === '') { closeUl(); out.push('<div class="h-2"></div>'); continue }
    closeUl()
    out.push(`<p>${inline(line)}</p>`)
  }
  closeUl()
  return out.join('\n')
}
// -----------------------------------------------------------------------------

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

export function ClientNotes({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const active = notes.find(n => n.id === activeId) || null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/notes`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes)
        setActiveId(prev => prev ?? (data.notes[0]?.id ?? null))
      }
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { load() }, [load])

  async function addNote() {
    const res = await fetch(`/api/admin/clients/${clientId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', body: '' }),
    })
    if (res.ok) {
      const { note } = await res.json()
      setNotes(prev => [note, ...prev])
      setActiveId(note.id)
      setMode('edit')
    } else {
      toast.error('Could not create note')
    }
  }

  // debounced autosave of the active note's title/body
  function queueSave(patch: { title?: string; body?: string }) {
    if (!active) return
    setNotes(prev => prev.map(n => n.id === active.id ? { ...n, ...patch } : n))
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/admin/notes/${active.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        setSaveState('saved')
        setNotes(prev => prev.map(n => n.id === active.id ? { ...n, updated_at: new Date().toISOString() } : n))
        setTimeout(() => setSaveState('idle'), 1200)
      } catch {
        setSaveState('idle')
        toast.error('Save failed')
      }
    }, 600)
  }

  async function togglePin(n: Note) {
    const pinned = n.pinned ? 0 : 1
    setNotes(prev => {
      const updated = prev.map(x => x.id === n.id ? { ...x, pinned } : x)
      return [...updated].sort((a, b) => b.pinned - a.pinned || (a.updated_at < b.updated_at ? 1 : -1))
    })
    await fetch(`/api/admin/notes/${n.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !!pinned }),
    })
  }

  async function remove(n: Note) {
    if (!confirm('Delete this note? This cannot be undone.')) return
    setNotes(prev => prev.filter(x => x.id !== n.id))
    if (activeId === n.id) setActiveId(null)
    await fetch(`/api/admin/notes/${n.id}`, { method: 'DELETE' })
    toast.success('Note deleted')
  }

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      {/* Left: list */}
      <div className="space-y-2">
        <button onClick={addNote} className="btn-primary w-full justify-center">
          <Plus className="h-4 w-4" /> New note
        </button>
        <div className="card p-0 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
          {loading ? (
            <p className="text-sm text-neutral-500 p-3">Loading…</p>
          ) : notes.length === 0 ? (
            <div className="p-4 text-center text-sm text-neutral-500">
              <StickyNote className="h-6 w-6 mx-auto mb-2 opacity-60" />
              No notes yet. Create one to start.
            </div>
          ) : notes.map(n => {
            const isActive = n.id === activeId
            const preview = (n.body || '').replace(/[#*`>_-]/g, '').trim().slice(0, 60)
            return (
              <button
                key={n.id}
                onClick={() => { setActiveId(n.id); setMode('edit') }}
                className={`w-full text-left px-3 py-2.5 transition ${
                  isActive ? 'bg-brand/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/40'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {n.pinned ? <Pin className="h-3 w-3 text-brand flex-shrink-0" /> : null}
                  <span className="font-medium text-sm truncate">
                    {n.title?.trim() || 'Untitled note'}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 truncate">{preview || 'Empty'}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{timeAgo(n.updated_at)}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: editor */}
      <div className="card min-h-[320px]">
        {!active ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-sm text-neutral-500 py-12">
            <StickyNote className="h-8 w-8 mb-3 opacity-60" />
            Select a note on the left, or create a new one.
            <p className="text-xs mt-2 max-w-xs">
              Supports Markdown: <code># heading</code>, <code>**bold**</code>, <code>- lists</code>, and <code>- [ ] checkboxes</code>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={active.title ?? ''}
                onChange={e => queueSave({ title: e.target.value })}
                placeholder="Note title"
                className="input flex-1 font-semibold"
              />
              <button
                onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
                className="btn-secondary !py-1.5 !px-2.5"
                title={mode === 'edit' ? 'Preview' : 'Edit'}
              >
                {mode === 'edit' ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </button>
              <button
                onClick={() => togglePin(active)}
                className="btn-secondary !py-1.5 !px-2.5"
                title={active.pinned ? 'Unpin' : 'Pin to top'}
              >
                {active.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </button>
              <button
                onClick={() => remove(active)}
                className="btn-danger !py-1.5 !px-2.5"
                title="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {mode === 'edit' ? (
              <textarea
                value={active.body}
                onChange={e => queueSave({ body: e.target.value })}
                placeholder="Start typing… (Markdown supported)"
                className="input w-full min-h-[240px] font-mono text-sm leading-relaxed"
              />
            ) : (
              <div
                className="prose-sm max-w-none text-sm leading-relaxed min-h-[240px]"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(active.body) }}
              />
            )}

            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>
                {active.author_name ? `By ${active.author_name} · ` : ''}
                Updated {timeAgo(active.updated_at)}
              </span>
              <span className="inline-flex items-center gap-1">
                {saveState === 'saving' && 'Saving…'}
                {saveState === 'saved' && (<><Check className="h-3 w-3 text-green-500" /> Saved</>)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
