export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    assigned:    'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  }
  const labels: Record<string, string> = { assigned: 'Not started', in_progress: 'In progress', completed: 'Completed' }
  const cls = styles[status] || styles.assigned
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{labels[status] || status}</span>
}
