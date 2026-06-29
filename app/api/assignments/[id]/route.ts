import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

const overrideFields = ['override_sets', 'override_reps', 'override_hold_seconds', 'override_rom_degrees'] as const

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const body = await req.json()
  const db = getDb()

  const current = db.prepare("select * from client_assignments where id=?").get(id) as any
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = current.client_id === user.id
  const isAdmin = user.role === 'admin'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isAdmin) {
    if (body.admin_recommendations !== undefined) {
      return NextResponse.json({ error: 'Clients cannot edit recommendations' }, { status: 403 })
    }
    if (body.programme_title !== undefined) {
      return NextResponse.json({ error: 'Clients cannot edit programme title' }, { status: 403 })
    }
    for (const f of overrideFields) {
      if (body[f] !== undefined) {
        return NextResponse.json({ error: 'Clients cannot edit overrides' }, { status: 403 })
      }
    }
    if (body.status && body.status !== 'completed') {
      return NextResponse.json({ error: 'Clients can only mark complete' }, { status: 403 })
    }
  }

  const updates: string[] = []
  const values: any[] = []

  if (body.status !== undefined) {
    updates.push('status = ?')
    values.push(body.status)
    const now = new Date().toISOString()
    if (current.status === 'assigned' && body.status === 'in_progress') {
      updates.push('started_at = ?'); values.push(now)
    }
    if (body.status === 'completed') {
      updates.push('completed_at = ?'); values.push(now)
      if (!current.started_at) { updates.push('started_at = ?'); values.push(now) }
    }
    if (current.status === 'completed' && body.status !== 'completed') {
      updates.push('completed_at = ?'); values.push(null)
    }
  }

  if (body.admin_recommendations !== undefined) {
    updates.push('admin_recommendations = ?')
    values.push(body.admin_recommendations)
  }

  // v7.4.5: programme title override
  if (body.programme_title !== undefined) {
    const v = body.programme_title
    updates.push('programme_title = ?')
    values.push(v === null || v === '' ? null : String(v).trim().slice(0, 200))
  }

  for (const f of overrideFields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`)
      const v = body[f]
      values.push(v === null || v === '' ? null : Number(v))
    }
  }

  if (!updates.length) return NextResponse.json({ ok: true })

  values.push(id)
  db.prepare(`update client_assignments set ${updates.join(', ')} where id = ?`).run(...values)
  return NextResponse.json({ ok: true })
}
