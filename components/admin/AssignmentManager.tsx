'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, ChevronDown, ChevronRight, Save, Dumbbell, MessageCircle, FileText } from 'lucide-react'
import { AssignmentStatusControl } from '@/components/admin/AssignmentStatusControl'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { CommentsThread } from '@/components/client/CommentsThread'
import { ProgrammeAdminToolbar } from '@/components/admin/ProgrammeAdminToolbar'
import { timeAgo } from '@/lib/utils'

interface RehabType { id: string, name: string, color: string, stages: any[] }

export function AssignmentManager({
  clientId, clientEmail, rehabTypes, existing, unreadByAssignment, currentUserId,
}: {
  clientId: string,
  clientEmail: string | null,
  rehabTypes: RehabType[],
  existing: any[],
  unreadByAssignment: Record<string, number>,
  currentUserId: string,
}) {
  const router = useRouter()
  const [typeId, setTypeId] = useState('')
  const [stageId, setStageId] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const selectedType = rehabTypes.find(t => t.id === typeId)

  async function assign(e: React.FormEvent) {
    e.preventDefault()
    if (!typeId) return toast.error('Pick a rehab type')
    setBusy(true)
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        rehabTypeId: typeId,
        stageId: stageId || null,
        adminRecommendations: recommendations,
      }),
    })
    setBusy(false)
    if (res.ok) {
      const data = await res.json()
      const cleared = (data.clearedMilestones || 0) + (data.clearedVideos || 0)
      if (cleared > 0) {
        toast.success(`Assigned. Cleared ${data.clearedMilestones} milestone(s) + ${data.clearedVideos} video view(s) from prior progress.`)
      } else {
        toast.success('Assigned')
      }
      setTypeId(''); setStageId(''); setRecommendations('')
      router.refresh()
    } else {
      toast.error('Failed')
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this assignment? The client loses access immediately.')) return
    const res = await fetch('/api/assignments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success('Removed'); router.refresh() }
  }

  async function saveRecs(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_recommendations: fd.get('recs') }),
    })
    if (res.ok) { toast.success('Notes saved'); router.refresh() }
  }

  async function saveOverrides(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const numberOrNull = (k: string) => {
      const v = fd.get(k)
      if (v === null || v === '') return null
      const n = Number(v)
      return isNaN(n) ? null : n
    }
    const res = await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        override_sets:         numberOrNull('override_sets'),
        override_reps:         numberOrNull('override_reps'),
        override_hold_seconds: numberOrNull('override_hold_seconds'),
        override_rom_degrees:  numberOrNull('override_rom_degrees'),
      }),
    })
    if (res.ok) { toast.success('Overrides saved'); router.refresh() }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={assign} className="card space-y-3">
        <h2 className="font-semibold">New Assignment</h2>
        <select className="input" value={typeId} onChange={e => { setTypeId(e.target.value); setStageId('') }}>
          <option value="">{'\u2014 Pick a rehab type \u2014'}</option>
          {rehabTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {selectedType && (
          <select className="input" value={stageId} onChange={e => setStageId(e.target.value)}>
            <option value="">Whole programme</option>
            {selectedType.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <textarea
          className="input"
          rows={3}
          placeholder="Recommendations / notes for this assignment"
          value={recommendations}
          onChange={e => setRecommendations(e.target.value)}
        />
        <p className="text-xs text-neutral-500">
          Heads-up: if this client previously had progress (milestones or video views) in this scope, those will be cleared so the new assignment starts fresh.
        </p>
        <button className="btn-primary" disabled={busy}>{busy ? 'Assigning\u2026' : 'Assign'}</button>
      </form>

      <div className="card">
        <h2 className="font-semibold mb-3">Existing Assignments</h2>
        {existing.length === 0 && <p className="text-sm text-neutral-500">No assignments yet.</p>}
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {existing.map((a: any) => {
            const unread = unreadByAssignment[a.id] || 0
            const defaultProgrammeTitle = a.stage_name
              ? `${a.type_name} \u2014 ${a.stage_name}`
              : a.type_name
            return (
              <div key={a.id} className="py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <button onClick={() => setExpanded(s => ({ ...s, [a.id]: !s[a.id] }))} className="text-neutral-500 mt-1">
                    {expanded[a.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <span className="h-3 w-3 mt-1.5 rounded-full" style={{ background: a.type_color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      {a.type_name}
                      {a.programme_title && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-brand bg-brand/10 rounded px-1.5 py-0.5">
                          <FileText className="h-3 w-3" /> custom title
                        </span>
                      )}
                      {unread > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                          <MessageCircle className="h-3 w-3" /> {unread} new
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">{a.stage_name || 'Whole programme'}</div>
                  </div>
                  <AssignmentStatusControl assignmentId={a.id} status={a.status} />
                  <button onClick={() => remove(a.id)} className="btn-danger !p-2"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="ml-8 space-y-1">
                  <ProgressBar
                    percent={a.progress?.percent ?? 0}
                    label={`${a.progress?.done ?? 0} / ${a.progress?.total ?? 0}`}
                  />
                  <div className="text-xs text-neutral-500 flex justify-between">
                    <span>
                      {a.progress?.completedMilestones ?? 0} milestone(s) {'\u00b7'} {a.progress?.watchedVideos ?? 0} video(s) watched
                    </span>
                    <span>Last activity: {timeAgo(a.last_activity_at)}</span>
                  </div>
                </div>
                {expanded[a.id] && (
                  <div className="ml-8 space-y-4 pt-2">
                    <form onSubmit={e => saveRecs(e, a.id)} className="space-y-2">
                      <label className="text-xs uppercase tracking-wide text-neutral-500">Recommendations / notes</label>
                      <textarea name="recs" defaultValue={a.admin_recommendations || ''} className="input" rows={3}
                        placeholder="Recommendations / notes" />
                      <button className="btn-primary !py-1.5"><Save className="h-4 w-4" /> Save notes</button>
                    </form>
                    <form onSubmit={e => saveOverrides(e, a.id)} className="space-y-2">
                      <label className="text-xs uppercase tracking-wide text-neutral-500 flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" /> Exercise overrides (optional)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <NumField name="override_sets"         label="Sets"           defaultValue={a.override_sets} />
                        <NumField name="override_reps"         label="Reps"           defaultValue={a.override_reps} />
                        <NumField name="override_hold_seconds" label="Hold (s)"       defaultValue={a.override_hold_seconds} />
                        <NumField name="override_rom_degrees"  label="Target ROM (\u00b0)" defaultValue={a.override_rom_degrees} />
                      </div>
                      <p className="text-xs text-neutral-500">
                        Leave blank to use the video defaults. Overrides apply to every video in this assignment.
                      </p>
                      <button className="btn-primary !py-1.5"><Save className="h-4 w-4" /> Save overrides</button>
                    </form>

                    {/* v7.4.5.1: PDF tools moved here from the standalone assignment page */}
                    <ProgrammeAdminToolbar
                      assignmentId={a.id}
                      clientEmail={clientEmail}
                      initialProgrammeTitle={a.programme_title || null}
                      defaultProgrammeTitle={defaultProgrammeTitle}
                    />

                    {/* Inline conversation for THIS assignment */}
                    <div>
                      <label className="text-xs uppercase tracking-wide text-neutral-500 flex items-center gap-1 mb-2">
                        <MessageCircle className="h-3 w-3" /> Conversation
                      </label>
                      <CommentsThread
                        assignmentId={a.id}
                        currentUserId={currentUserId}
                        currentUserRole="admin"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NumField({ name, label, defaultValue }: any) {
  return (
    <div>
      <label className="text-xs text-neutral-500">{label}</label>
      <input
        name={name}
        type="number" min="0" step="1"
        defaultValue={defaultValue ?? ''}
        className="input mt-1"
      />
    </div>
  )
}
