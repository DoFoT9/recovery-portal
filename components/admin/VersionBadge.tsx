'use client'

import { useEffect, useState } from 'react'

interface VersionInfo {
  version: string
  commit: string | null
}

export function VersionBadge() {
  const [info, setInfo] = useState<VersionInfo | null>(null)
  useEffect(() => {
    fetch('/api/version').then(r => r.ok ? r.json() : null).then(setInfo).catch(() => {})
  }, [])
  if (!info) return null
  const display = info.commit
    ? `v${info.version} · ${info.commit.slice(0, 7)}`
    : `v${info.version}`
  return (
    <p className="text-[10px] text-neutral-400 text-center py-2 select-none" title="Application version">
      {display}
    </p>
  )
}
