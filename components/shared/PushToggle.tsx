'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { urlBase64ToUint8Array } from '@/lib/client-utils'

export function PushToggle() {
  const [supported, setSupported] = useState(true)
  const [configured, setConfigured] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [isIOSStandalone, setIsIOSStandalone] = useState(true)

  useEffect(() => {
    const sw = 'serviceWorker' in navigator
    const push = 'PushManager' in window
    setSupported(sw && push)

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const standalone = (window.matchMedia('(display-mode: standalone)').matches)
      || (navigator as any).standalone === true
    setIsIOSStandalone(!isIOS || standalone)

    fetch('/api/users/me/push').then(r => r.json()).then(d => setConfigured(!!d.configured)).catch(() => {})

    if (sw && push) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return
        reg.pushManager.getSubscription().then(sub => setEnabled(!!sub))
      })
    }
  }, [])

  async function enable() {
    if (!supported) return toast.error('Push not supported in this browser')
    if (!configured) return toast.error('Push is not configured on the server (VAPID keys missing)')
    if (!isIOSStandalone) return toast.error('On iOS, Add to Home Screen first, then come back')

    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { toast.error('Permission denied'); setBusy(false); return }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) { toast.error('Missing VAPID public key'); setBusy(false); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })

      const res = await fetch('/api/users/me/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      })
      if (res.ok) { setEnabled(true); toast.success('Notifications enabled') }
      else toast.error('Failed to register')
    } catch (e: any) {
      toast.error(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/users/me/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setEnabled(false)
      toast.success('Notifications disabled')
    } catch {
      toast.error('Failed')
    } finally {
      setBusy(false)
    }
  }

  if (!supported || !configured) return null

  return (
    <button
      onClick={enabled ? disable : enable}
      disabled={busy}
      className="p-1.5 rounded-md text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
      title={enabled ? 'Disable notifications' : 'Enable notifications'}
      aria-label={enabled ? 'Disable notifications' : 'Enable notifications'}
    >
      {enabled ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
    </button>
  )
}
