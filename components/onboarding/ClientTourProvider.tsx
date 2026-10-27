// components/onboarding/ClientTourProvider.tsx
//
// v7.8 — client-side welcome tour. Same zero-dependency spotlight engine as the
// admin tour, with the flick-fix (v7.6.1) baked in: the tooltip stays hidden until
// it's positioned, so it never flashes centre-first. Uses its OWN localStorage keys
// so it can't collide with the admin tour. Auto-launches on a client's first login
// (onboarding_completed_at is null for new accounts) and can be replayed via the
// 'rp-client-tour:start' window event.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { CLIENT_TOUR_STEPS, type ClientTourStep } from './clientTourSteps'

const LS_ACTIVE = 'rp_client_tour_active'
const LS_STEP = 'rp_client_tour_step'

interface Rect { top: number; left: number; width: number; height: number }

export function ClientTourProvider({ onboardingComplete }: { onboardingComplete: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [positioned, setPositioned] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const step: ClientTourStep | undefined = CLIENT_TOUR_STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === CLIENT_TOUR_STEPS.length - 1

  useEffect(() => {
    setMounted(true)
    const wasActive = localStorage.getItem(LS_ACTIVE) === '1'
    const savedStep = parseInt(localStorage.getItem(LS_STEP) || '0', 10)
    if (wasActive) {
      setActive(true)
      setStepIndex(Number.isFinite(savedStep) ? savedStep : 0)
    } else if (!onboardingComplete) {
      setActive(true)
      setStepIndex(0)
      localStorage.setItem(LS_ACTIVE, '1')
      localStorage.setItem(LS_STEP, '0')
    }

    const onStart = () => {
      setActive(true)
      setStepIndex(0)
      localStorage.setItem(LS_ACTIVE, '1')
      localStorage.setItem(LS_STEP, '0')
    }
    window.addEventListener('rp-client-tour:start', onStart)
    return () => window.removeEventListener('rp-client-tour:start', onStart)
  }, [onboardingComplete])

  useEffect(() => {
    if (active) localStorage.setItem(LS_STEP, String(stepIndex))
  }, [active, stepIndex])

  useEffect(() => {
    if (!active || !step) return
    if (step.route && step.route !== pathname) {
      router.push(step.route)
    }
  }, [active, step, pathname, router])

  const measure = useCallback(() => {
    if (!step?.selector) { setRect(null); return true }
    const el = document.querySelector(step.selector) as HTMLElement | null
    if (!el) return false
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return false
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return true
  }, [step])

  useEffect(() => {
    if (!active || !step) return
    setPositioned(false)
    setRect(null)

    if (!step.selector) { setPositioned(true); return }

    let tries = 0
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      tries += 1
      const found = measure()
      if (found) {
        setPositioned(true)
        if (pollRef.current) clearInterval(pollRef.current)
      } else if (tries > 40) {
        setRect(null)
        setPositioned(true)
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }, 100)

    const onMove = () => { if (document.querySelector(step.selector!)) measure() }
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [active, step, measure])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (isLast) return finish()
    setStepIndex(i => Math.min(i + 1, CLIENT_TOUR_STEPS.length - 1))
  }
  function back() {
    setStepIndex(i => Math.max(i - 1, 0))
  }
  async function finish() {
    setActive(false)
    localStorage.removeItem(LS_ACTIVE)
    localStorage.removeItem(LS_STEP)
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' })
    } catch { /* best effort */ }
  }

  if (!mounted || !active || !step) return null

  const pad = 8
  const spotlight = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null

  const TT_W = 340
  let ttStyle: React.CSSProperties
  if (spotlight) {
    const place = step.placement || 'bottom'
    const vh = window.innerHeight
    const belowRoom = vh - (spotlight.top + spotlight.height)
    const useTop = place === 'top' || (place === 'bottom' && belowRoom < 200)
    const top = useTop ? Math.max(12, spotlight.top - 12 - 180) : spotlight.top + spotlight.height + 12
    let left = spotlight.left + spotlight.width / 2 - TT_W / 2
    left = Math.max(12, Math.min(left, window.innerWidth - TT_W - 12))
    ttStyle = { top, left, width: TT_W }
  } else {
    ttStyle = { top: '50%', left: '50%', width: TT_W, transform: 'translate(-50%, -50%)' }
  }

  const progress = `${stepIndex + 1} / ${CLIENT_TOUR_STEPS.length}`

  return createPortal(
    <div className="fixed inset-0 z-[9998]" aria-live="polite" role="dialog" aria-modal="true">
      {positioned && !spotlight && <div className="absolute inset-0 bg-black/60" />}

      {positioned && spotlight && (
        <div
          className="absolute rounded-xl ring-2 ring-brand transition-all duration-200 pointer-events-none"
          style={{
            top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          }}
        />
      )}

      <div
        className={`absolute z-[9999] rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl
                    dark:border-neutral-800 dark:bg-neutral-900
                    transition-opacity duration-150 ${positioned ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={ttStyle}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">{progress}</span>
          <button onClick={finish} className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
            Skip
          </button>
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={back}
            disabled={isFirst}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 disabled:opacity-40
                       hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Back
          </button>
          <button
            onClick={next}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
