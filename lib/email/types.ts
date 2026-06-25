export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export interface EmailAdapter {
  name: string
  send(msg: EmailMessage): Promise<{ messageId?: string }>
  verify?(): Promise<{ ok: boolean; error?: string }>
}

export type EmailProviderName = 'console' | 'smtp'

export interface EmailConfig {
  provider: EmailProviderName
  fromName: string
  fromEmail: string
  replyTo: string | null
  smtp: {
    host: string
    port: number
    secure: boolean
    user: string
    password: string
  } | null
  appBaseUrl: string
  sendWelcome: boolean
}
