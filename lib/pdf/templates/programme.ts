import 'server-only'
import { getBranding, hexToRgbTriplet } from '@/lib/branding'

export interface ProgrammeExercise {
  index: number
  videoId: string
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
  /** videoId -> slot (1-4) -> data:image/jpeg;base64,... */
  frames: Map<string, Map<number, string>>
  /** Inline data URI for the clinic logo, or null if not configured. */
  logoDataUri: string | null
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
  if (e.target_rom_degrees != null) parts.push(`${e.target_rom_degrees}°`)
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

function renderFrameGrid(videoId: string, frames: Map<string, Map<number, string>>): string {
  const videoFrames = frames.get(videoId)
  const cells = [1, 2, 3, 4].map(slot => {
    const dataUri = videoFrames?.get(slot)
    if (dataUri) {
      return `<div class="frame-cell filled"><img src="${dataUri}" alt="Exercise frame ${slot}" /></div>`
    }
    return `<div class="frame-cell empty"><span class="empty-label">No frame ${slot}</span></div>`
  }).join('')

  return `<div class="frame-grid">${cells}</div>`
}

export function renderProgrammeHtml(ctx: ProgrammeContext): string {
  const b = getBranding()
  const brandRgb = hexToRgbTriplet(b.brand_color)
  const brandDarkRgb = hexToRgbTriplet(b.brand_color_dark)

  const clinicLine = b.footer_clinic_name
    ? escapeHtml(b.footer_clinic_name)
    : escapeHtml(b.portal_name)

  const logoBlock = ctx.logoDataUri
    ? `<img src="${ctx.logoDataUri}" alt="${clinicLine}" class="logo" />`
    : `<div class="logo-fallback">${clinicLine}</div>`

  const exerciseBlocks = ctx.exercises.map(e => {
    const formula = formatPrescription(e)
    return `
      <article class="exercise">
        ${formula ? `<div class="formula">${escapeHtml(formula)}</div>` : ''}
        <div class="exercise-grid">
          ${renderFrameGrid(e.videoId, ctx.frames)}
          <div class="exercise-body">
            <h2 class="exercise-title">
              <span class="exercise-num">${e.index}.</span>${escapeHtml(e.title)}
            </h2>
            <div class="exercise-desc">
              ${paragraphs(e.description)}
            </div>
          </div>
        </div>
      </article>
    `
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(ctx.programmeTitle)}</title>
<style>
  :root {
    --brand-rgb: ${brandRgb};
    --brand-dark-rgb: ${brandDarkRgb};
    --brand: rgb(var(--brand-rgb));
    --brand-dark: rgb(var(--brand-dark-rgb));
    --brand-tint: rgb(var(--brand-rgb) / 0.08);
  }
  @page { size: A4; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a;
    font-size: 10.5pt;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Header */
  .doc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 10px;
    margin-bottom: 14px;
    border-bottom: 3px solid var(--brand);
  }
  .doc-header .left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .doc-header .logo {
    max-height: 44px;
    max-width: 140px;
    object-fit: contain;
  }
  .doc-header .logo-fallback {
    font-weight: 700;
    font-size: 13pt;
    color: var(--brand);
  }
  .doc-header .clinic {
    font-weight: 600;
    font-size: 11pt;
    color: #1a1a1a;
  }
  .doc-header .client {
    font-size: 9pt;
    color: #525252;
    margin-top: 2px;
  }
  .doc-header .programme-title {
    font-size: 15pt;
    font-weight: 700;
    color: #1a1a1a;
    text-align: right;
    max-width: 60%;
  }

  /* Exercise blocks */
  .exercise {
    page-break-inside: avoid;
    margin-bottom: 16px;
    padding: 12px 0 14px 0;
    border-bottom: 1px solid #e5e5e5;
    position: relative;
  }
  .exercise:last-child { border-bottom: none; }

  .formula {
    display: inline-block;
    float: right;
    font-size: 10pt;
    font-weight: 600;
    color: var(--brand-dark);
    background: var(--brand-tint);
    border: 1px solid rgb(var(--brand-rgb) / 0.25);
    padding: 3px 10px;
    border-radius: 999px;
    margin-bottom: 8px;
    margin-left: 8px;
  }

  .exercise-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 16px;
    align-items: start;
  }

  /* 2x2 frame grid */
  .frame-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 4px;
    aspect-ratio: 1 / 1;
    width: 200px;
  }
  .frame-cell {
    background: #f5f5f5;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 96px;
  }
  .frame-cell.filled {
    border: 1px solid #d4d4d4;
  }
  .frame-cell.filled img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #f5f5f5;
  }
  .frame-cell.empty {
    border: 1px dashed #d4d4d4;
  }
  .empty-label {
    font-size: 8pt;
    color: #a3a3a3;
    font-style: italic;
  }

  /* Exercise text */
  .exercise-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .exercise-title {
    font-size: 12.5pt;
    font-weight: 700;
    margin: 0 0 8px 0;
    padding-bottom: 4px;
    border-bottom: 2px solid var(--brand);
    color: #1a1a1a;
  }
  .exercise-num {
    color: var(--brand);
    margin-right: 6px;
    font-weight: 700;
  }
  .exercise-desc p {
    margin: 0 0 6px 0;
    color: #262626;
  }
  .exercise-desc p:last-child { margin-bottom: 0; }
  .muted { color: #a3a3a3; }
</style>
</head>
<body>
  <header class="doc-header">
    <div class="left">
      ${logoBlock}
      <div>
        <div class="clinic">${clinicLine}</div>
        ${ctx.clientName ? `<div class="client">Prepared for ${escapeHtml(ctx.clientName)}</div>` : ''}
      </div>
    </div>
    <div class="programme-title">${escapeHtml(ctx.programmeTitle)}</div>
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
  const abn = b.footer_abn ? ` &middot; ABN ${escapeHtml(b.footer_abn)}` : ''
  const printedOn = new Date().toLocaleDateString('en-AU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  return `
    <div style="font-size:8pt; font-family:-apple-system,Segoe UI,Roboto,sans-serif; color:#737373; width:100%; padding:0 12mm; display:flex; justify-content:space-between; align-items:center;">
      <span>${escapeHtml(programmeTitle)} &mdash; ${escapeHtml(clinic)}${abn} &mdash; printed ${printedOn}</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
  `
}
