export function ProgressBar({ percent, label }: { percent: number, label?: string }) {
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div className="space-y-1">
      <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
        <div className="bg-brand h-full transition-all" style={{ width: `${p}%` }} />
      </div>
      {label !== undefined && (
        <div className="text-xs text-neutral-500 flex justify-between">
          <span>{label}</span>
          <span>{p}%</span>
        </div>
      )}
    </div>
  )
}
