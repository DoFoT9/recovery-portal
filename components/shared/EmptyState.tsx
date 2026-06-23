import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  /** Legacy / short form */
  message?: string
  /** Preferred for v6 */
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({
  title,
  message,
  description,
  icon,
  action,
}: EmptyStateProps) {
  const desc = description ?? message
  return (
    <div className="card text-center py-10 flex flex-col items-center">
      <div className="mb-3 text-neutral-400">
        {icon ?? <Inbox className="h-10 w-10" strokeWidth={1.5} />}
      </div>
      <h3 className="font-semibold text-neutral-700 dark:text-neutral-200">
        {title}
      </h3>
      {desc && (
        <p className="text-sm text-neutral-500 mt-1 max-w-sm">{desc}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
