'use client'

import { useState } from 'react'
import { Nav } from '@/components/shared/Nav'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { Footer } from '@/components/shared/Footer'
import { VersionBadge } from '@/components/admin/VersionBadge'
import type { Theme } from '@/lib/types'

interface AdminShellProps {
  currentTheme: Theme
  portalName: string
  hasLogo: boolean
  footer: {
    clinicName: string | null
    contact: string | null
    abn: string | null
    supportUrl: string | null
  }
  children: React.ReactNode
}

export function AdminShell({
  currentTheme, portalName, hasLogo, footer, children,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <ThemeProvider>
      <Nav
        variant="admin"
        currentTheme={currentTheme}
        onOpenSidebar={() => setSidebarOpen(true)}
        portalName={portalName}
        hasLogo={hasLogo}
      />
      <div className="flex">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0">
          {children}
          <Footer {...footer} />
          <VersionBadge />
        </main>
      </div>
    </ThemeProvider>
  )
}
