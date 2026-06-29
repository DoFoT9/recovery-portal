'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileDown, Mail, Loader2, X, AlertCircle, Save } from 'lucide-react'

interface Props {
  assignmentId: string
  clientEmail: string | null
  initialProgrammeTitle: string | null
  defaultProgrammeTitle: string
}

export function ProgrammeAdminToolbar({
  assignmentId, clientEmail, initialProgrammeTitle, defaultProgrammeTitle,
}: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialProgrammeTitle || '')
  const [savingTitle, setSavingTitle] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [sending, setSending] = useState(false)

  async function saveTitle() {
    setSavingTitle(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programme_title: title.trim() || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save')
      }
      toast.success(title.trim() ? 'Programme title saved' : 'Programme title cleared (using default)')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSavingTitle(false)
    }
  }

  async function downloadPdf() {
    setDownloading(true)
    try {
      const url = `/api/admin/assignments/${assignmentId}/programme.pdf?download=1`
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `PDF generation failed (${res.status})`)
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
      toast.success('PDF downloaded')
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  async function sendEmail() {
    setSending(true)
    try {
      const res = await fetch(`/api/admin/assignments/${assignmentId}/email-pdf`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Send failed (${res.status})`)
      }
      const kb = Math.round((data.bytes || 0) / 1024)
      toast.success(`PDF emailed to ${data.sentTo} (${kb} KB)`)
      setEmailModalOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Could not send email')
    } finally {
      setSending(false)
    }
  }

  const titleDirty = (title.trim() || null) !== (initialProgrammeTitle || null)
  const canEmail = !!(clientEmail && clientEmail.includes('@'))

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Programme PDF</h2>
        <span className="text-xs text-neutral-500">Admin tools</span>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500">Programme title (optional override)</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={defaultProgrammeTitle}
            maxLength={200}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={saveTitle}
            disabled={savingTitle || !titleDirty}
            title="Save the programme title override"
          >
            {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
        <p className="text-[11px] text-neutral-400">
          Leave blank to use the default: <span className="font-mono">{defaultProgrammeTitle}</span>.
          Shown on the PDF header, the filename, and the email subject.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={downloadPdf}
          disabled={downloading}
          className="btn-secondary"
          title="Download the PDF to your device"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {downloading ? 'Generating\u2026' : 'Download PDF'}
        </button>

        <button
          type="button"
          onClick={() => setEmailModalOpen(true)}
          disabled={!canEmail}
          className="btn-secondary"
          title={canEmail ? `Email the PDF to ${clientEmail}` : 'Client has no email address'}
        >
          <Mail className="h-4 w-4" />
          Email PDF to client
        </button>

        {!canEmail && (
          <span className="text-xs text-amber-700 dark:text-amber-300 inline-flex items-center gap-1 self-center">
            <AlertCircle className="h-3 w-3" />
            No client email on file
          </span>
        )}
      </div>

      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !sending && setEmailModalOpen(false)}>
          <div
            className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-5 space-y-3"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-confirm-title"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="email-confirm-title" className="font-semibold text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand" />
                Email programme PDF
              </h3>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                disabled={sending}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Send the programme PDF as an attachment to:
            </p>
            <p className="font-mono text-sm bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded">
              {clientEmail}
            </p>
            <p className="text-xs text-neutral-500">
              The email will use the portal&apos;s branded template and include the PDF as an attachment.
              The client will also be able to download the same PDF from their assignment page in the portal.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                disabled={sending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendEmail}
                disabled={sending}
                className="btn-primary"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {sending ? 'Sending\u2026' : 'Send email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
