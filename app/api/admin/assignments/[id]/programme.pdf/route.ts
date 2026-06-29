import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { buildProgrammeContext, buildPdfFilename } from '@/lib/pdf/build-context'
import { renderProgrammeHtml, renderFooterTemplate } from '@/lib/pdf/templates/programme'
import { renderPdf } from '@/lib/pdf/render'
import { log } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // v7.4.5: allow the client owner to download their own programme, plus any admin.
  const user = await requireUser()
  const { id } = await params

  const db = getDb()
  const ownership = db.prepare(
    "select client_id from client_assignments where id = ?"
  ).get(id) as { client_id: string } | undefined

  if (!ownership) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  if (user.role !== 'admin' && ownership.client_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ctx = buildProgrammeContext(id)
  if (!ctx) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  const url = new URL(req.url)
  const dispositionParam = url.searchParams.get('download') === '1' ? 'attachment' : 'inline'

  try {
    const html = renderProgrammeHtml(ctx)
    const footer = renderFooterTemplate(ctx.programmeTitle)
    const pdf = await renderPdf({
      html,
      footerHtml: footer,
      margin: { top: '14mm', bottom: '18mm', left: '12mm', right: '12mm' },
    })

    log.info('pdf.programme.generated', {
      assignmentId: id,
      exercises: ctx.exercises.length,
      bytes: pdf.byteLength,
      requester_role: user.role,
    })

    const filename = buildPdfFilename(ctx)

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${dispositionParam}; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'Content-Length': String(pdf.byteLength),
      },
    })
  } catch (err: any) {
    log.error('pdf.programme.failed', {
      assignmentId: id,
      error: err?.message || String(err),
    })
    return NextResponse.json(
      { error: 'PDF generation failed - check server logs' },
      { status: 500 },
    )
  }
}
