import { NextResponse } from 'next/server'
import { getAppVersion, getCommitHash } from '@/lib/version'

export async function GET() {
  return NextResponse.json(
    { version: getAppVersion(), commit: getCommitHash() },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}
