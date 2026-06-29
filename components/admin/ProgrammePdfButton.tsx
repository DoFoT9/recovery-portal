'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { FileDown, Loader2 } from 'lucide-react'

/**
 * Provisional "Download programme PDF" button for v7.4.3.
 *
 * Opens the PDF inline in a new tab so the clinician can preview before
 * deciding to save / print. v7.4.5 will add an "Email PDF" partner button.
 */
export function ProgrammePdfButton({ assignmentId }: { assignmentId: string }) {
  const [busy, setBusy] = useState(false)

  async function openPdf() {
    setBusy(true)
    try {
      const url = `/api/admin/assignments/${assignmentId}/programme.pdf`
      const res = await fetch(url, { method: 'GET' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `PDF generation failed (${res.status})`)
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
      toast.success('Programme PDF generated')
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate PDF')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={openPdf}
      disabled={busy}
      className="btn-secondary"
      title="Generate a printable PDF of this programme"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {busy ? 'Generating…' : 'Download programme PDF'}
    </button>
  )
}
