'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Sparkles, Loader2, AlertCircle, RefreshCw, ArrowDown } from 'lucide-react'

type TranscriptStatus = 'none' | 'pending' | 'processing' | 'ready' | 'failed'

interface Props {
  videoId: string
  initialStatus: TranscriptStatus
  initialText: string | null
  initialError: string | null
  onUseAsDescription: (text: string) => void
}

export function VideoTranscriptSection({
  videoId, initialStatus, initialText, initialError, onUseAsDescription,
}: Props) {
  const [status, setStatus] = useState<TranscriptStatus>(initialStatus || 'none')
  const [text, setText] = useState<string | null>(initialText)
  const [error, setError] = useState<string | null>(initialError)
  const [triggering, setTriggering] = useState(false)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    function clear() {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    if (status === 'pending' || status === 'processing') {
      pollRef.current = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/videos/${videoId}/transcribe`)
          if (!res.ok) return
          const data = await res.json()
          setStatus(data.transcript_status)
          setText(data.transcript_text)
          setError(data.transcript_error)
          if (data.transcript_status === 'ready' || data.transcript_status === 'failed') {
            clear()
          }
        } catch { /* ignore transient errors */ }
      }, 3000) as unknown as number
    }
    return clear
  }, [status, videoId])

  async function trigger() {
    setTriggering(true)
    try {
      const res = await fetch(`/api/admin/videos/${videoId}/transcribe`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Failed (${res.status})`)
      }
      setStatus('pending')
      setText(null)
      setError(null)
      toast.success('Transcription queued')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="border border-brand/30 bg-brand/5 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold">Audio transcription</h3>
        <StatusBadge status={status} />
      </div>

      {status === 'none' && (
        <div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
            Generate exercise notes automatically from the video&apos;s audio. Audio is processed locally on this server &mdash; nothing leaves your network.
          </p>
          <button
            type="button"
            onClick={trigger}
            disabled={triggering}
            className="btn-secondary !py-1.5 text-xs"
          >
            {triggering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Transcribe audio
          </button>
        </div>
      )}

      {(status === 'pending' || status === 'processing') && (
        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status === 'pending'
            ? 'Queued \u2014 waiting for an available worker\u2026'
            : 'Processing audio\u2026 typically 30-60s for a clinical video.'}
        </div>
      )}

      {status === 'ready' && text && (
        <div className="space-y-2">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded p-2 text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
            {text}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onUseAsDescription(text)}
              className="btn-primary !py-1.5 text-xs"
            >
              <ArrowDown className="h-3 w-3" />
              Use as exercise notes
            </button>
            <button
              type="button"
              onClick={trigger}
              disabled={triggering}
              className="btn-secondary !py-1.5 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              Re-transcribe
            </button>
          </div>
        </div>
      )}

      {status === 'ready' && !text && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 italic">
            No speech detected in this video &mdash; write the description manually.
          </p>
          <button
            type="button"
            onClick={trigger}
            disabled={triggering}
            className="btn-secondary !py-1.5 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span>{error || 'Transcription failed.'}</span>
          </div>
          <button
            type="button"
            onClick={trigger}
            disabled={triggering}
            className="btn-secondary !py-1.5 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: TranscriptStatus }) {
  const styles: Record<TranscriptStatus, { label: string; cls: string }> = {
    none: { label: 'Not started', cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
    pending: { label: 'Queued', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    ready: { label: 'Ready', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    failed: { label: 'Failed', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  }
  const s = styles[status]
  return <span className={`text-[10px] uppercase tracking-wide font-medium rounded px-1.5 py-0.5 ${s.cls}`}>{s.label}</span>
}
