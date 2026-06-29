import 'server-only'
import { getBranding } from '@/lib/branding'

/**
 * v7.4.3 programme template — text-only, no photos yet.
 *
 * v7.4.4 will:
 *   - add the 2x2 frame grid on the left
 *   - move sets/reps formula to the right-aligned chip
 *   - use brand colour accents (numbered title underline, etc.)
 *   - embed clinic logo
 *
 * For now we get the structure + pagination right so v7.4.4 is pure styling.
 */

export interface ProgrammeExercise {
  index: number
  title: string
  description: string | null
  sets: number | null
  reps: number | null
  hold_seconds: number | null
  target_rom_degrees: number | null
}

export interface ProgrammeContext {
  programmeTitle: string
  clientName: string | null
  exercises: ProgrammeExercise[]
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch
  ))
}

function formatPrescription(e: ProgrammeExercise): string {
  const parts: string[] = []
  if (e.sets != null) parts.push(`${e.sets} Set${e.sets === 1 ? '' : 's'}`)
  if (e.reps != null) parts.push(`${e.reps} Rep${e.reps === 1 ? '' : 's'}`)
  if (e.hold_seconds != null) parts.push(`${e.hold_seconds}s hold`)
  if (e.target_rom_degrees != null) parts.push(`${e.target_rom_degrees}\u00b0`)
  return parts.join(' / ')
}

function paragraphs(text: string | null): string {
  if (!text || !text.trim()) {
    return '<p class="muted"><em>No description provided.</em></p>'
  }
  return text
    .split(/\n\s*\n/)
    .map(p => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function renderProgrammeHtml(ctx: ProgrammeContext): string {
  const b = getBranding()

  const exerciseBlocks = ctx.exercises.map(e => {
    const formula = formatPrescription(e)
    return `
      <article class="exercise">
        <div class="exercise-grid">
          <div class="frame-grid placeholder">
            <div class="frame-cell"></div>
            <div class="frame-cell"></div>
            <div class="frame-cell"></div>
            <div class="frame-cell"></div>
          </div>
          <div class="exercise-body">
            ${formula ? `<div class="formula">${escapeHtml(formula)}</div>` : ''}
            <h2 class="exercise-title">
              <span class="exercise-num">${e.index}.</span> ${escapeHtml(e.title)}
            </h2>
            <div class="exercise-desc">
              ${paragraphs(e.description)}
            </div>
          </div>
        </div>
      </article>
    `
  }).join('\n')

  const clinicLine = b.footer_clinic_name
    ? escapeHtml(b.footer_clinic_name)
    : escapeHtml(b.portal_name)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(ctx.programmeTitle)}</title>
<style>
  @page { size: A4; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a1a;
    font-size: 11pt;
    line-height: 1.4;
  }
  .header {
    border-bottom: 2px solid #d4d4d4;
    padding-bottom: 8px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .header .clinic { font-weight: 600; font-size: 12pt; }
  .header .programme { font-size: 14pt; font-weight: 700; }
  .header .client { font-size: 10pt; color: #525252; }

  .exercise {
    page-break-inside: avoid;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e5e5e5;
  }
  .exercise:last-child { border-bottom: none; }

  .exercise-grid {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 14px;
  }

  .frame-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 4px;
    aspect-ratio: 1 / 1;
  }
  .frame-cell {
    background: #f5f5f5;
    border: 1px dashed #d4d4d4;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8pt;
    color: #a3a3a3;
    min-height: 80px;
  }
  .frame-grid.placeholder .frame-cell::before {
    content: 'No frame yet';
    font-style: italic;
  }

  .exercise-body { display: flex; flex-direction: column; }
  .formula {
    align-self: flex-end;
    font-size: 10pt;
    font-weight: 600;
    color: #404040;
    background: #f5f5f5;
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 6px;
  }
  .exercise-title {
    font-size: 12pt;
    font-weight: 700;
    margin: 0 0 6px 0;
  }
  .exercise-num { color: #525252; margin-right: 4px; }
  .exercise-desc p { margin: 0 0 6px 0; }
  .exercise-desc p:last-child { margin-bottom: 0; }
  .muted { color: #a3a3a3; }
</style>
</head>
<body>
  <header class="header">
    <div>
      <div class="clinic">${clinicLine}</div>
      ${ctx.clientName ? `<div class="client">Prepared for ${escapeHtml(ctx.clientName)}</div>` : ''}
    </div>
    <div class="programme">${escapeHtml(ctx.programmeTitle)}</div>
  </header>

  <main>
    ${exerciseBlocks || '<p class="muted">This programme has no exercises yet.</p>'}
  </main>
</body>
</html>`
}

export function renderFooterTemplate(programmeTitle: string): string {
  const b = getBranding()
  const clinic = b.footer_clinic_name || b.portal_name
  const printedOn = new Date().toLocaleDateString('en-AU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  return `
    <div style="font-size:8pt; font-family:-apple-system,Segoe UI,Roboto,sans-serif; color:#737373; width:100%; padding:0 10mm; display:flex; justify-content:space-between;">
      <span>${escapeHtml(programmeTitle)} &mdash; ${escapeHtml(clinic)} &mdash; printed ${printedOn}</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
  `
}
