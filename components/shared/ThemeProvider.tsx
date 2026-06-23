'use client'
import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function onChange() {
      const t = document.documentElement.dataset.theme || 'system'
      if (t === 'system') {
        if (mq.matches) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return <>{children}</>
}
