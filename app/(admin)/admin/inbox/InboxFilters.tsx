'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export default function InboxFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const unread = params.get('unread') === '1'

  const setUnread = (v: boolean) => {
    const sp = new URLSearchParams(params.toString())
    if (v) sp.set('unread', '1')
    else sp.delete('unread')
    router.replace(`${pathname}?${sp.toString()}`)
  }

  const cls = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-md transition ${
      active
        ? 'bg-brand text-white'
        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
    }`

  return (
    <div className="flex gap-2" role="tablist" aria-label="Inbox filters">
      <button role="tab" aria-selected={!unread} className={cls(!unread)} onClick={() => setUnread(false)}>
        All
      </button>
      <button role="tab" aria-selected={unread} className={cls(unread)} onClick={() => setUnread(true)}>
        Unread
      </button>
    </div>
  )
}
