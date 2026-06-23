'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function DashboardAutoRefresh({
  intervalMs = 30000, children,
}: { intervalMs?: number, children: React.ReactNode }) {
  const router = useRouter()
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    function canRefresh() {
      return typeof navigator !== 'undefined'
        && navigator.onLine
        && typeof document !== 'undefined'
        && document.visibilityState === 'visible'
    }
    function refreshNow() { if (canRefresh()) router.refresh() }
    function scheduleNext() {
      stop()
      timerRef.current = window.setInterval(refreshNow, intervalMs)
    }
    function stop() {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        refreshNow(); scheduleNext()
      } else {
        stop()
      }
    }
    function onOnline() { refreshNow(); scheduleNext() }
    function onOffline() { stop() }

    if (canRefresh()) scheduleNext()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [intervalMs, router])

  return <>{children}</>
}
