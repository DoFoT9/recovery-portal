import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { buildProgrammeContext } from '@/lib/pdf/build-context'
import { renderProgrammeHtml, renderFooterTemplate } from '@/lib/pdf/templates/programme'
import { renderPdf } from '@/lib/pdf/render'
import { log } from '@/lib/log'

// Force Node.js runtime - Playwright won't run on the edge.
export const runtime = 'nodejs'
// Don't cache - content changes whenever the assignment, videos, or frames change.
export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin()
  const { id } = await params

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
    })

    const filenameSafeTitle = ctx.programmeTitle
      .replace(/[^a-zA-Z0-9-_ ]+/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'programme'

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${dispositionParam}; filename="${filenameSafeTitle}.pdf"`,
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
