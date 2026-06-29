import 'server-only'
import { getEmailConfig } from './config'
import { createConsoleAdapter } from './adapters/console'
import { createSmtpAdapter } from './adapters/smtp'
import { renderTemplate, type TemplateName, type TemplateVars } from './templates'
import { log } from '@/lib/log'
import type { EmailAdapter, EmailAttachment } from './types'

function getAdapter(): EmailAdapter {
  const config = getEmailConfig()
  switch (config.provider) {
    case 'smtp': return createSmtpAdapter(config)
    case 'console':
    default: return createConsoleAdapter()
  }
}

export async function sendBrandedEmail<T extends TemplateName>(opts: {
  to: string
  template: T
  vars: TemplateVars[T]
  replyTo?: string
  attachments?: EmailAttachment[]
}) {
  try {
    const { subject, html, text } = await renderTemplate(opts.template, opts.vars)
    const adapter = getAdapter()
    const result = await adapter.send({
      to: opts.to,
      subject,
      html,
      text,
      replyTo: opts.replyTo,
      attachments: opts.attachments,
    })
    log.info('email.sent', {
      to: opts.to,
      template: opts.template,
      provider: adapter.name,
      messageId: result.messageId,
      attachments: opts.attachments?.length || 0,
    })
    return { ok: true, messageId: result.messageId }
  } catch (err: any) {
    log.error('email.failed', { to: opts.to, template: opts.template, error: err?.message || String(err) })
    return { ok: false, error: err?.message || String(err) }
  }
}

export async function verifyEmailConfig(): Promise<{ ok: boolean; provider: string; error?: string }> {
  try {
    const adapter = getAdapter()
    if (adapter.verify) {
      const result = await adapter.verify()
      return { ok: result.ok, provider: adapter.name, error: result.error }
    }
    return { ok: true, provider: adapter.name }
  } catch (err: any) {
    return { ok: false, provider: 'unknown', error: err?.message || String(err) }
  }
}
