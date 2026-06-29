import 'server-only'
import type { EmailAdapter, EmailMessage } from '../types'

export function createConsoleAdapter(): EmailAdapter {
  return {
    name: 'console',
    async send(msg: EmailMessage) {
      const line = '\u2500'.repeat(60)
      console.log(`\n${line}`)
      console.log(`[EMAIL] To: ${msg.to}`)
      console.log(`[EMAIL] Subject: ${msg.subject}`)
      if (msg.replyTo) console.log(`[EMAIL] Reply-To: ${msg.replyTo}`)
      console.log(line)
      console.log(msg.text)
      console.log(line)
      console.log(`[EMAIL] (HTML: ${msg.html.length} chars)`)
      if (msg.attachments && msg.attachments.length > 0) {
        for (const a of msg.attachments) {
          const size = (a.content as any).byteLength || (a.content as any).length || 0
          console.log(`[EMAIL] Attachment: ${a.filename} (${a.contentType}, ${size} bytes)`)
        }
      }
      console.log(line + '\n')
      return { messageId: `console-${Date.now()}` }
    },
    async verify() { return { ok: true } },
  }
}
