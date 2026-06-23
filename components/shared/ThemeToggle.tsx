'use client'
import { Sun, Moon, Monitor } from 'lucide-react'
import { toast } from 'sonner'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (dark) document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
}

export function ThemeToggle({ current }: { current: Theme }) {
  async function set(theme: Theme) {
    applyTheme(theme)
    const res = await fetch('/api/users/me/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme }),
    })
    if (!res.ok) toast.error('Could not save preference')
  }

  const btn = (theme: Theme, Icon: any, label: string) => (
    <button
      onClick={() => set(theme)}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-md transition ${
        current === theme
          ? 'bg-brand text-white'
          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 p-0.5">
      {btn('light', Sun, 'Light mode')}
      {btn('dark', Moon, 'Dark mode')}
      {btn('system', Monitor, 'Follow system')}
    </div>
  )
}
