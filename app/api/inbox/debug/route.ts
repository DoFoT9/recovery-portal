import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getTotalUnreadCount, getInboxClients } from '@/lib/inbox'

export async function GET() {
  const admin = await requireAdmin()
  const db = getDb()

  const totalComments = (db.prepare(
    "select count(*) c from assignment_comments"
  ).get() as any).c

  const clientComments = (db.prepare(`
    select count(*) c from assignment_comments c
    join users u on u.id = c.author_id
    where u.role = 'client'
  `).get() as any).c

  const adminComments = (db.prepare(`
    select count(*) c from assignment_comments c
    join users u on u.id = c.author_id
    where u.role = 'admin'
  `).get() as any).c

  const unreadCount = getTotalUnreadCount()

  const recentClientComments = db.prepare(`
    select c.id, c.assignment_id, c.body, c.created_at,
           u.full_name as author_name, u.role as author_role,
           ca.last_comments_seen_by_admin_at,
           case when ca.last_comments_seen_by_admin_at is null
                  or c.created_at > ca.last_comments_seen_by_admin_at
                then 1 else 0 end as is_unread
    from assignment_comments c
    join users u on u.id = c.author_id
    join client_assignments ca on ca.id = c.assignment_id
    where u.role = 'client'
    order by c.created_at desc
    limit 10
  `).all()

  const inboxClients = getInboxClients({ limit: 20 })

  return NextResponse.json({
    admin: { id: admin.id, email: admin.email, role: admin.role },
    stats: {
      totalComments,
      clientComments,
      adminComments,
      unreadCount,
      inboxClientsTotal: inboxClients.length,
      inboxClientsWithUnread: inboxClients.filter(c => c.unread_count > 0).length,
    },
    recentClientComments,
    inboxClients,
    timestamp: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
