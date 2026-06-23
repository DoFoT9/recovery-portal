import { NextResponse } from 'next/server'
import { requireAdmin, hashPassword } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json()
  const db = getDb()

  const existing = db.prepare("select id, role from users where id=?").get(id) as any
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: string[] = []
  const values: any[] = []

  if (body.fullName !== undefined) {
    updates.push('full_name = ?')
    values.push((body.fullName || '').trim() || null)
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim()
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    updates.push('email = ?')
    values.push(email)
  }
  if (body.password && String(body.password).trim()) {
    const hash = await hashPassword(String(body.password).trim())
    updates.push('password_hash = ?')
    values.push(hash)
  }
  if (body.disabled !== undefined) {
    if (existing.role === 'admin' && body.disabled === true) {
      return NextResponse.json(
        { error: 'Admins cannot be disabled via this endpoint' },
        { status: 403 },
      )
    }
    updates.push('disabled_at = ?')
    values.push(body.disabled ? new Date().toISOString() : null)
  }

  if (!updates.length) return NextResponse.json({ ok: true })
  values.push(id)
  try {
    db.prepare(`update users set ${updates.join(', ')} where id = ?`).run(...values)
  } catch (e: any) {
    if (String(e.message).match(/unique/i)) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const db = getDb()

  const user = db.prepare("select role from users where id=?").get(id) as any
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role !== 'client') {
    return NextResponse.json(
      { error: 'Only clients can be deleted via this endpoint' },
      { status: 403 },
    )
  }

  // Cascades via foreign keys: client_assignments, assignment_comments,
  // client_milestones, video_views, push_subscriptions
  db.prepare('delete from users where id=?').run(id)
  return NextResponse.json({ ok: true })
}
