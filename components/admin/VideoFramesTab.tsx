'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Camera, RotateCcw, Trash2, Play, Pause, AlertCircle, Images,
} from 'lucide-react'

interface FrameSlot {
  slot: number
  captured_at: string | null
  version: number
}

interface Props {
  videoId: string
  initialFrames: { slot: number; captured_at: string }[]
}

const SLOT_LABELS: Record<number, string> = {
  1: 'Top-left',
  2: 'Top-right',
  3: 'Bottom-left',
  4: 'Bottom-right',
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoFramesTab({ videoId, initialFrames }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState<number | null>(null)

  const [slots, setSlots] = useState<FrameSlot[]>(() => {
    const map = new Map(initialFrames.map(f => [f.slot, f.captured_at]))
    return [1, 2, 3, 4].map(n => ({
      slot: n,
      captured_at: map.get(n) || null,
      version: 0,
    }))
  })

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onLoaded = () => {
      setDuration(v.duration)
      setVideoReady(true)
      setVideoError(null)
    }
    const onTime = () => setCurrentTime(v.currentTime)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onError = () => {
      setVideoError('Could not load video. Refresh the page or re-upload the file.')
      setVideoReady(false)
    }

    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('error', onError)

    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('error', onError)
    }
  }, [])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  function onScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current
    if (!v) return
    const t = Number(e.target.value)
    v.currentTime = t
    setCurrentTime(t)
  }

  async function captureFrame(slot: number) {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return
    if (!videoReady) {
      toast.error('Video is not ready yet')
      return
    }

    const w = v.videoWidth
    const h = v.videoHeight
    if (!w || !h) {
      toast.error('Video dimensions not available — try scrubbing first')
      return
    }

    setCapturing(slot)
    try {
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) throw new Error('Canvas context unavailable')

      const wasPlaying = !v.paused
      v.pause()

      ctx.drawImage(v, 0, 0, w, h)

      const blob = await new Promise<Blob | null>(resolve =>
        c.toBlob(b => resolve(b), 'image/jpeg', 0.85),
      )
      if (!blob) throw new Error('Could not encode frame as JPEG')

      const fd = new FormData()
      fd.append('file', blob, `slot-${slot}.jpg`)
      const res = await fetch(`/api/admin/videos/${videoId}/frames/${slot}`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Upload failed (${res.status})`)
      }

      setSlots(prev =>
        prev.map(s =>
          s.slot === slot
            ? { ...s, captured_at: new Date().toISOString(), version: s.version + 1 }
            : s,
        ),
      )
      toast.success(`Captured slot ${slot} (${SLOT_LABELS[slot]})`)

      if (wasPlaying) v.play().catch(() => {})
    } catch (e: any) {
      toast.error(e.message || 'Capture failed')
    } finally {
      setCapturing(null)
    }
  }

  async function clearSlot(slot: number) {
    if (!confirm(`Clear the captured frame in slot ${slot}?`)) return
    try {
      const res = await fetch(`/api/admin/videos/${videoId}/frames/${slot}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setSlots(prev =>
        prev.map(s =>
          s.slot === slot ? { ...s, captured_at: null, version: s.version + 1 } : s,
        ),
      )
      toast.success(`Cleared slot ${slot}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to clear')
    }
  }

  const filledCount = slots.filter(s => s.captured_at).length

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h2 className="font-semibold flex items-center gap-2">
          <Images className="h-4 w-4 text-brand" />
          Capture frames for the PDF programme
        </h2>
        <p className="text-sm text-neutral-500">
          Scrub to the moments that best demonstrate the exercise, then capture 4 frames.
          These appear in a 2×2 grid on the printable PDF programme alongside the exercise notes.
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {filledCount} / 4 captured
          </span>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={`/api/media/videos/${videoId}`}
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
          />
        </div>

        {videoError && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {videoError}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!videoReady}
              className="btn-secondary !p-2"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={currentTime}
              onChange={onScrub}
              disabled={!videoReady}
              className="flex-1 accent-brand"
              aria-label="Video scrubber"
            />
            <span className="text-xs font-mono tabular-nums text-neutral-500 whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Tip: pause first for a clean still, then click the capture button for the slot you want.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {slots.map(s => {
            const isFilled = !!s.captured_at
            const isBusy = capturing === s.slot
            return (
              <button
                key={s.slot}
                type="button"
                onClick={() => captureFrame(s.slot)}
                disabled={!videoReady || isBusy}
                className={`btn-secondary !py-2 text-xs flex flex-col items-center gap-1 ${
                  isFilled ? '!border-brand text-brand' : ''
                }`}
                title={SLOT_LABELS[s.slot]}
              >
                <Camera className="h-4 w-4" />
                <span>
                  {isBusy
                    ? 'Capturing…'
                    : isFilled
                    ? `Recapture slot ${s.slot}`
                    : `Capture for slot ${s.slot}`}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">PDF layout preview</h2>
        <p className="text-xs text-neutral-500">
          This grid mirrors how the frames will appear in the printable PDF (top-left, top-right, bottom-left, bottom-right).
        </p>
        <div className="grid grid-cols-2 gap-2 max-w-md">
          {slots.map(s => (
            <FrameSlotPreview
              key={s.slot}
              videoId={videoId}
              slot={s.slot}
              filled={!!s.captured_at}
              version={s.version}
              onClear={() => clearSlot(s.slot)}
              onRecapture={() => captureFrame(s.slot)}
              busy={capturing === s.slot}
              canCapture={videoReady}
            />
          ))}
        </div>
      </section>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

function FrameSlotPreview({
  videoId, slot, filled, version, onClear, onRecapture, busy, canCapture,
}: {
  videoId: string
  slot: number
  filled: boolean
  version: number
  onClear: () => void
  onRecapture: () => void
  busy: boolean
  canCapture: boolean
}) {
  const src = `/api/admin/videos/${videoId}/frames/${slot}?v=${version}`

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
      {filled ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Captured frame for slot ${slot}`} className="w-full h-full object-contain" />
          <div className="absolute top-1 left-1 text-[10px] font-semibold bg-black/60 text-white rounded px-1.5 py-0.5">
            Slot {slot}
          </div>
          <div className="absolute bottom-1 right-1 flex gap-1">
            <button
              type="button"
              onClick={onRecapture}
              disabled={busy || !canCapture}
              className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white hover:bg-black/80 flex items-center gap-1"
              title="Recapture from current playhead"
            >
              <RotateCcw className="h-3 w-3" />
              Recapture
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={busy}
              className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/80 text-white hover:bg-red-600 flex items-center gap-1"
              title="Clear this slot"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 m-1 rounded">
          <span className="text-xs font-semibold text-neutral-500">Slot {slot}</span>
          <span className="text-[10px] text-neutral-400 mt-1 px-1">
            Scrub the video, then click <span className="font-medium">Capture for slot {slot}</span>
          </span>
        </div>
      )}
    </div>
  )
}
