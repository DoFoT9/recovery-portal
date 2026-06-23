'use client'

import Link from 'next/link'
import { LogOut, Menu, Activity } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { PushToggle } from '@/components/shared/PushToggle'
import type { Theme } from '@/lib/types'

interface NavProps {
  variant: 'client' | 'admin'
  currentTheme: Theme
  onOpenSidebar?: () => void
  portalName: string
  hasLogo: boolean
}

export function Nav({
  variant, currentTheme, onOpenSidebar, portalName, hasLogo,
}: NavProps) {
  async function out() {
    await fetch('/api/auth/logout', { method: 'POST' })
    location.href = '/login'
  }
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white/90 dark:bg-neutral-950/90 backdrop-blur z-30">
      <div className="px-4 py-3 flex items-center gap-3">
        {variant === 'admin' && onOpenSidebar && (
          <button onClick={onOpenSidebar} className="lg:hidden btn-secondary !p-1.5">
            <Menu className="h-4 w-4" />
          </button>
        )}
        <Link
          href={variant === 'admin' ? '/admin' : '/dashboard'}
          className="flex items-center gap-2 font-semibold min-w-0"
        >
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/branding/logo" alt={portalName} className="h-7 w-auto max-w-[180px] object-contain" />
          ) : (
            <Activity className="h-5 w-5 text-brand" />
          )}
          <span className="truncate">
            {portalName}
            {variant === 'admin' && (
              <span className="text-neutral-400 font-normal"> · Admin</span>
            )}
          </span>
        </Link>
        <div className="flex-1" />
        <PushToggle />
        <ThemeToggle current={currentTheme} />
        <button onClick={out} className="btn-secondary !p-1.5" title="Sign out" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
