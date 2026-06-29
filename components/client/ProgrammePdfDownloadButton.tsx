'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { FileDown, Loader2 } from 'lucide-react'

export function ProgrammePdfDownloadButton({ assignmentId }: { assignmentId: string }) {
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    try {
      const url = `/api/admin/assignments/${assignmentId}/programme.pdf?download=1`
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Could not generate PDF (${res.status})`)
      }
      const disp = res.headers.get('content-disposition') || ''
      const match = disp.match(/filename="([^"]+)"/)
      const filename = match?.[1] || 'programme.pdf'

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch (e: any) {
      toast.error(e?.message || 'Could not download PDF')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="btn-secondary"
      title="Download a printable PDF of your programme"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {busy ? 'Generating\u2026' : 'Download programme PDF'}
    </button>
  )
}
