import { getDb, id } from '@/lib/db'

let configured = false

export function isPushConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
  if (!publicKey || !privateKey) throw new Error('VAPID keys not configured')
  return { publicKey, privateKey, subject }
}

async function getWebPush() {
  const webpush = (await import('web-push')).default
  if (!configured) {
    const k = getVapidKeys()
    webpush.setVapidDetails(k.subject, k.publicKey, k.privateKey)
    configured = true
  }
  return webpush
}

export async function sendPushToUser(userId: string, payload: { title: string, body: string, url?: string }) {
  if (!isPushConfigured()) return { sent: 0, failed: 0 }
  const db = getDb()
  const subs = db.prepare("select * from push_subscriptions where user_id=?").all(userId) as any[]
  if (!subs.length) return { sent: 0, failed: 0 }

  const webpush = await getWebPush()
  let sent = 0, failed = 0
  for (const s of subs) {
    const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload))
      sent++
    } catch (e: any) {
      failed++
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        db.prepare("delete from push_subscriptions where id=?").run(s.id)
      }
    }
  }
  return { sent, failed }
}

export function subscribeUser(userId: string, sub: any, userAgent?: string) {
  const db = getDb()
  try {
    db.prepare(
      "insert into push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent) values (?, ?, ?, ?, ?, ?)"
    ).run(id(), userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, userAgent || null)
    return true
  } catch {
    return false
  }
}

export function unsubscribeUser(userId: string, endpoint: string) {
  getDb().prepare("delete from push_subscriptions where user_id=? and endpoint=?")
    .run(userId, endpoint)
}
