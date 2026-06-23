'use client'
import { useRouter } from 'next/navigation'
import { Archive, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function VideoListActions({ videoId }: { videoId: string }) {
  const router = useRouter()
  async function archive() {
    if (!confirm('Archive this video?')) return
    const res = await fetch(`/api/videos/${videoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    if (res.ok) { toast.success('Archived'); router.refresh() }
  }
  async function del() {
    if (!confirm('Permanently delete this video and its file?')) return
    const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); router.refresh() }
  }
  return (
    <div className="flex gap-2">
      <button onClick={archive} className="btn-secondary !p-2" title="Archive"><Archive className="h-4 w-4" /></button>
      <button onClick={del} className="btn-danger !p-2" title="Delete"><Trash2 className="h-4 w-4" /></button>
    </div>
  )
}
