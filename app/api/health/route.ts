import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAppVersion } from '@/lib/version'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()
  let dbOk = false
  try {
    const db = getDb()
    db.prepare('SELECT 1 AS ok').get()
    dbOk = true
  } catch {
    dbOk = false
  }
  const status = dbOk ? 200 : 503
  return NextResponse.json(
    {
      status: dbOk ? 'ok' : 'degraded',
      version: getAppVersion(),
      db: dbOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - startedAt,
    },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}
