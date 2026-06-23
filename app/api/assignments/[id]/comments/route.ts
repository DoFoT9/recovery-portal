import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDb, id as newId } from '@/lib/db'

async function loadAssignmentAndCheck(assignmentId: string, user: any) {
  const db = getDb()
  const a = db.prepare("select * from client_assignments where id=?").get(assignmentId) as any
  if (!a) return null
  if (a.client_id !== user.id && user.role !== 'admin') return null
  return a
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const a = await loadAssignmentAndCheck(id, user)
  if (!a) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

  const comments = getDb().prepare(`
    select c.id, c.body, c.created_at,
           u.full_name as author_name, u.email as author_email, u.role as author_role
    from assignment_comments c
    join users u on u.id = c.author_id
    where c.assignment_id = ?
    order by c.created_at asc
  `).all(id)
  return NextResponse.json(comments)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const a = await loadAssignmentAndCheck(id, user)
  if (!a) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

  const { body } = await req.json()
  if (!body || !body.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 })

  getDb().prepare(
    "insert into assignment_comments (id, assignment_id, author_id, body) values (?, ?, ?, ?)"
  ).run(newId(), id, user.id, body.trim())

  return NextResponse.json({ ok: true })
}
