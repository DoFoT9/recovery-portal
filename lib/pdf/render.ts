import 'server-only'
import { chromium, type Browser } from 'playwright'

/**
 * Server-only Playwright wrapper that turns HTML into a PDF buffer.
 *
 * We cache a single Chromium browser instance for the lifetime of the Node
 * process. Each render opens a fresh context+page so renders don't leak state
 * between each other. For low volume this is plenty; if we ever hit
 * concurrent generation, we can swap this for a small pool.
 */

let browserPromise: Promise<Browser> | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }).catch(err => {
      // Reset on failure so the next call retries cleanly
      browserPromise = null
      throw err
    })
  }
  return browserPromise
}

export interface RenderPdfOptions {
  /** Full HTML document (including <!DOCTYPE>, <html>, <head>, <body>). */
  html: string
  /** A4 (default) or Letter. */
  format?: 'A4' | 'Letter'
  /** Margins in CSS units, e.g. "12mm". Defaults match the QLD sample. */
  margin?: { top?: string; right?: string; bottom?: string; left?: string }
  /** Optional HTML for the print header (Playwright header template). */
  headerHtml?: string
  /** Optional HTML for the print footer (Playwright footer template). */
  footerHtml?: string
  /** Whether to print background colours (we usually want true for branding). */
  printBackground?: boolean
}

export async function renderPdf(opts: RenderPdfOptions): Promise<Buffer> {
  const browser = await getBrowser()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // setContent + waitUntil 'networkidle' so any inline images / fonts settle.
    await page.setContent(opts.html, { waitUntil: 'networkidle' })

    const buf = await page.pdf({
      format: opts.format || 'A4',
      printBackground: opts.printBackground ?? true,
      margin: {
        top: opts.margin?.top ?? '12mm',
        right: opts.margin?.right ?? '10mm',
        bottom: opts.margin?.bottom ?? '12mm',
        left: opts.margin?.left ?? '10mm',
      },
      displayHeaderFooter: !!(opts.headerHtml || opts.footerHtml),
      headerTemplate: opts.headerHtml || '<span></span>',
      footerTemplate: opts.footerHtml || '<span></span>',
    })

    return buf
  } finally {
    await page.close().catch(() => {})
    await context.close().catch(() => {})
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null)
    browserPromise = null
    if (b) await b.close().catch(() => {})
  }
}
