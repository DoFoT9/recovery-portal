import 'server-only'
import nodemailer from 'nodemailer'
import type { EmailAdapter, EmailMessage, EmailConfig } from '../types'

export function createSmtpAdapter(config: EmailConfig): EmailAdapter {
  if (!config.smtp) throw new Error('SMTP config missing')
  const { host, port, secure, user, password } = config.smtp
  if (!host) throw new Error('SMTP host is required')

  const transporter = nodemailer.createTransport({
    host, port, secure,
    auth: user ? { user, pass: password } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 5_000,
    socketTimeout: 30_000,
  })

  const fromAddress = `"${config.fromName}" <${config.fromEmail || user}>`

  return {
    name: 'smtp',
    async send(msg: EmailMessage) {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        replyTo: msg.replyTo || config.replyTo || undefined,
      })
      return { messageId: info.messageId }
    },
    async verify() {
      try { await transporter.verify(); return { ok: true } }
      catch (e: any) { return { ok: false, error: e?.message || String(e) } }
    },
  }
}
