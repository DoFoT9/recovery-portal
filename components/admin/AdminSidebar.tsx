'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import {
  Home, Users, FolderTree, Video, Upload, BarChart3, Inbox, Settings, X,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  isInbox?: boolean
}

const items: NavItem[] = [
  { href: '/admin',               label: 'Home',        icon: Home },
  { href: '/admin/clients',       label: 'Clients',     icon: Users },
  { href: '/admin/inbox',         label: 'Inbox',       icon: Inbox, isInbox: true },
  { href: '/admin/rehab-types',   label: 'Rehab Types', icon: FolderTree },
  { href: '/admin/videos',        label: 'Videos',      icon: Video },
  { href: '/admin/videos/upload', label: 'Upload',      icon: Upload },
  { href: '/admin/reports',       label: 'Reports',     icon: BarChart3 },
  { href: '/admin/settings',      label: 'Settings',    icon: Settings },
]

function useInboxUnreadCount(pollMs = 15_000) {
  const [count, setCount] = useState<number>(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox/unread-count', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { count: number }
      setCount(data.count ?? 0)
    } catch {}
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => { if (!cancelled) await fetchCount() }
    run()
    const timer = setInterval(run, pollMs)
    const onRefresh = () => run()
    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    const onFocus = () => run()
    window.addEventListener('inbox:refresh', onRefresh)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('inbox:refresh', onRefresh)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [pollMs, fetchCount])

  return count
}

export function AdminSidebar({
  open, onClose,
}: { open: boolean, onClose: () => void }) {
  const pathname = usePathname()
  const unreadCount = useInboxUnreadCount()

  useEffect(() => { onClose() }, [pathname]) // eslint-disable-line

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    if (pathname === href) return true
    if (pathname.startsWith(href + '/')) {
      const moreSpecific = items.find(i =>
        i.href !== href &&
        i.href.startsWith(href + '/') &&
        (pathname === i.href || pathname.startsWith(i.href + '/'))
      )
      return !moreSpecific
    }
    return false
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, isInbox }) => {
        const active = isActive(href)
        const hasUnread = isInbox && unreadCount > 0
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
              active
                ? 'bg-brand text-white'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="relative flex-shrink-0">
              <Icon className="h-4 w-4" />
              {hasUnread && (
                <span
                  aria-hidden
                  className="pulse-ring absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-neutral-950"
                />
              )}
            </span>
            <span className={`flex-1 ${hasUnread ? 'font-semibold' : ''}`}>
              {label}
            </span>
            {hasUnread && (
              <span
                className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${
                  active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                }`}
                aria-label={`${unreadCount} unread`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      <aside className="hidden lg:block w-60 shrink-0 border-r border-neutral-200 dark:border-neutral-800 p-4">
        {nav}
      </aside>
      <div className={`lg:hidden fixed inset-0 z-50 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div onClick={onClose} className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-neutral-950 p-4 shadow-xl transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">Menu</span>
            <button onClick={onClose} className="btn-secondary !p-1.5">
              <X className="h-4 w-4" />
            </button>
          </div>
          {nav}
        </div>
      </div>
    </>
  )
}
