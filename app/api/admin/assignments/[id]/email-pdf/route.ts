import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getBranding } from '@/lib/branding'
import { buildProgrammeContext, buildPdfFilename } from '@/lib/pdf/build-context'
import { renderProgrammeHtml, renderFooterTemplate } from '@/lib/pdf/templates/programme'
import { renderPdf } from '@/lib/pdf/render'
import { sendBrandedEmail } from '@/lib/email/send'
import { log } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  const { id } = await params

  const db = getDb()
  const assignment = db.prepare(`
    select ca.id, ca.client_id, u.email as client_email, u.full_name as client_name
    from client_assignments ca
    join users u on u.id = ca.client_id
    where ca.id = ?
  `).get(id) as { id: string; client_id: string; client_email: string; client_name: string | null } | undefined

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }
  if (!assignment.client_email || !assignment.client_email.includes('@')) {
    return NextResponse.json({ error: 'Client has no valid email address on file' }, { status: 400 })
  }

  const ctx = buildProgrammeContext(id)
  if (!ctx) {
    return NextResponse.json({ error: 'Could not build programme context' }, { status: 500 })
  }

  try {
    const html = renderProgrammeHtml(ctx)
    const footer = renderFooterTemplate(ctx.programmeTitle)
    const pdf = await renderPdf({
      html,
      footerHtml: footer,
      margin: { top: '14mm', bottom: '18mm', left: '12mm', right: '12mm' },
    })

    const filename = buildPdfFilename(ctx)
    const branding = getBranding()
    const clinicName = branding.footer_clinic_name || branding.portal_name

    const result = await sendBrandedEmail({
      to: assignment.client_email,
      template: 'programme-pdf',
      vars: {
        name: assignment.client_name || assignment.client_email,
        programmeTitle: ctx.programmeTitle,
        clinicName,
        senderName: admin.full_name || null,
      },
      attachments: [{
        filename,
        content: Buffer.from(pdf),
        contentType: 'application/pdf',
      }],
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 })
    }

    log.info('pdf.programme.emailed', {
      assignmentId: id,
      to: assignment.client_email,
      pdfBytes: pdf.byteLength,
      sentBy: admin.id,
    })

    return NextResponse.json({
      ok: true,
      sentTo: assignment.client_email,
      filename,
      bytes: pdf.byteLength,
    })
  } catch (err: any) {
    log.error('pdf.programme.email.failed', {
      assignmentId: id,
      error: err?.message || String(err),
    })
    return NextResponse.json(
      { error: 'Failed to generate and send PDF - check server logs' },
      { status: 500 },
    )
  }
}
