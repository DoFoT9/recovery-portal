'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { FileText, NotebookPen, Images } from 'lucide-react'
import { VideoDetailsForm } from '@/components/admin/VideoDetailsForm'
import { VideoExerciseNotesForm } from '@/components/admin/VideoExerciseNotesForm'
import { VideoFramesTab } from '@/components/admin/VideoFramesTab'

type TabKey = 'details' | 'notes' | 'frames'

const TABS: { key: TabKey; label: string; Icon: typeof FileText }[] = [
  { key: 'details', label: 'Details', Icon: FileText },
  { key: 'notes', label: 'Exercise notes', Icon: NotebookPen },
  { key: 'frames', label: 'Frames', Icon: Images },
]

interface Props {
  video: any
  initialTab: string
  initialFrames: { slot: number; captured_at: string }[]
}

export default function VideoEditTabs({ video, initialTab, initialFrames }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const validTab = (TABS.find(t => t.key === initialTab)?.key) || 'details'
  const [active, setActive] = useState<TabKey>(validTab)
  const [, startTransition] = useTransition()

  const setTab = (k: TabKey) => {
    setActive(k)
    const sp = new URLSearchParams(params.toString())
    sp.set('tab', k)
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`))
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-1 sm:gap-4 overflow-x-auto" role="tablist">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = active === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 py-2.5 px-3 text-sm border-b-2 -mb-px transition whitespace-nowrap ${
                  isActive
                    ? 'border-brand text-brand font-medium'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {active === 'details' && <VideoDetailsForm video={video} />}
      {active === 'notes' && <VideoExerciseNotesForm video={video} />}
      {active === 'frames' && <VideoFramesTab videoId={video.id} initialFrames={initialFrames} />}
    </div>
  )
}
