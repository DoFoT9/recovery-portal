import 'server-only'
import { getBranding } from '@/lib/branding'
import { getEmailConfig } from './config'

export type TemplateName = 'password-reset' | 'welcome-client' | '2fa-enabled' | 'test' | 'programme-pdf'

export interface TemplateVars {
  'password-reset': { name: string; code: string; expiresInMinutes: number }
  'welcome-client': { name: string; setupUrl: string; portalName: string }
  '2fa-enabled': { name: string; when: string }
  'test': { name: string }
  'programme-pdf': { name: string; programmeTitle: string; clinicName: string; senderName: string | null }
}

interface Rendered { subject: string; html: string; text: string }

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] || ch))
}

function styles(brandColor: string): string {
  return `body{margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a1a1a}.container{max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5}.header{padding:24px;text-align:center;border-bottom:1px solid #f0f0f0}.header img{max-height:48px;max-width:200px}.header-name{font-size:20px;font-weight:600;color:${brandColor}}.content{padding:32px 24px;line-height:1.6}.content h1{font-size:22px;margin:0 0 16px;color:#1a1a1a}.content p{margin:0 0 16px;color:#404040}.code-box{background:#f5f5f5;border:1px solid #e5e5e5;border-radius:8px;padding:20px;text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:32px;font-weight:600;letter-spacing:6px;color:${brandColor};margin:24px 0}.btn{display:inline-block;background:${brandColor};color:#fff!important;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500}.footer{padding:16px 24px;text-align:center;font-size:12px;color:#888;border-top:1px solid #f0f0f0;background:#fafafa}.muted{color:#888;font-size:14px}.attachment-note{background:#f5f5f5;border-left:3px solid ${brandColor};padding:12px 16px;border-radius:4px;margin:16px 0;font-size:14px;color:#525252}`
}

function header(): string {
  const b = getBranding()
  const c = getEmailConfig()
  const logo = b.logo_filename && c.appBaseUrl
    ? `<img src="${c.appBaseUrl}/api/branding/logo" alt="${escapeHtml(b.portal_name)}">`
    : `<div class="header-name">${escapeHtml(b.portal_name)}</div>`
  return `<div class="header">${logo}</div>`
}

function footer(): string {
  const b = getBranding()
  const lines: string[] = []
  if (b.footer_clinic_name) lines.push(escapeHtml(b.footer_clinic_name))
  if (b.footer_contact) lines.push(escapeHtml(b.footer_contact))
  if (b.footer_abn) lines.push(`ABN ${escapeHtml(b.footer_abn)}`)
  if (!lines.length) lines.push('This is an automated message from your portal.')
  return `<div class="footer">${lines.join('<br>')}</div>`
}

function wrap(brandColor: string, content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${styles(brandColor)}</style></head><body><div class="container">${header()}<div class="content">${content}</div>${footer()}</div></body></html>`
}

export async function renderTemplate<T extends TemplateName>(name: T, vars: TemplateVars[T]): Promise<Rendered> {
  const b = getBranding()
  const portalName = b.portal_name
  const brandColor = b.brand_color || '#2563eb'

  switch (name) {
    case 'password-reset': {
      const v = vars as TemplateVars['password-reset']
      const subject = `Your ${portalName} password reset code`
      const html = wrap(brandColor, `<h1>Reset your password</h1><p>Hi ${escapeHtml(v.name)},</p><p>Use this code to reset your password:</p><div class="code-box">${v.code}</div><p class="muted">This code expires in ${v.expiresInMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.</p>`)
      const text = `Hi ${v.name},\n\nUse this code to reset your password: ${v.code}\n\nThis code expires in ${v.expiresInMinutes} minutes.\nIf you didn't request a password reset, you can safely ignore this email.\n\n- ${portalName}`
      return { subject, html, text }
    }
    case 'welcome-client': {
      const v = vars as TemplateVars['welcome-client']
      const subject = `Welcome to ${v.portalName}`
      const html = wrap(brandColor, `<h1>Welcome, ${escapeHtml(v.name)}</h1><p>Your clinician has set up your rehab portal account. Click the button below to set your password and get started:</p><p><a href="${escapeHtml(v.setupUrl)}" class="btn">Set up my account</a></p><p class="muted">This link expires in 7 days. If it doesn't work, ask your clinician to send a new one.</p><p class="muted">Once you've set your password, save it in your password manager for easy login.</p>`)
      const text = `Hi ${v.name},\n\nWelcome to ${v.portalName}.\n\nYour clinician has set up your account. Visit this link to set your password:\n\n${v.setupUrl}\n\nThis link expires in 7 days.\n\n- ${v.portalName}`
      return { subject, html, text }
    }
    case '2fa-enabled': {
      const v = vars as TemplateVars['2fa-enabled']
      const subject = `Two-factor authentication enabled on your ${portalName} account`
      const html = wrap(brandColor, `<h1>2FA is now active</h1><p>Hi ${escapeHtml(v.name)},</p><p>Two-factor authentication was enabled on your account on ${escapeHtml(v.when)}.</p><p class="muted">If this wasn't you, please contact your clinician immediately and change your password.</p>`)
      const text = `Hi ${v.name},\n\n2FA was enabled on your ${portalName} account on ${v.when}.\n\nIf this wasn't you, contact your clinician immediately and change your password.\n\n- ${portalName}`
      return { subject, html, text }
    }
    case 'test': {
      const v = vars as TemplateVars['test']
      const subject = `Test email from ${portalName}`
      const html = wrap(brandColor, `<h1>Email is working!</h1><p>Hi ${escapeHtml(v.name)},</p><p>If you're reading this, your email configuration is working correctly. Your portal can now send password resets, welcome emails, and audit notifications.</p>`)
      const text = `Hi ${v.name},\n\nTest email from ${portalName}.\n\nIf you're reading this, your email configuration is working correctly.\n\n- ${portalName}`
      return { subject, html, text }
    }
    case 'programme-pdf': {
      const v = vars as TemplateVars['programme-pdf']
      const subject = `Your recovery programme: ${v.programmeTitle}`
      const sentByLine = v.senderName ? `<p class="muted">Sent by ${escapeHtml(v.senderName)} from ${escapeHtml(v.clinicName)}.</p>` : ''
      const html = wrap(brandColor, `<h1>Your recovery programme</h1><p>Hi ${escapeHtml(v.name)},</p><p>Attached is your printable recovery programme: <strong>${escapeHtml(v.programmeTitle)}</strong>.</p><div class="attachment-note">\ud83d\udcc4 The PDF includes your exercises, prescribed sets &amp; reps, and reference photos. Print it, save it to your phone, or stick it on the fridge \u2014 whichever works for you.</div><p>You can also view and tick off each exercise in the portal as you complete it. If you have any questions, leave a comment on your assignment in the portal and your clinician will get back to you.</p>${sentByLine}`)
      const text = `Hi ${v.name},\n\nAttached is your printable recovery programme: ${v.programmeTitle}.\n\nThe PDF includes your exercises, prescribed sets & reps, and reference photos. Print it, save it to your phone, or stick it on the fridge - whichever works for you.\n\nYou can also view and tick off each exercise in the portal as you complete it. If you have any questions, leave a comment on your assignment in the portal and your clinician will get back to you.\n\n${v.senderName ? `Sent by ${v.senderName} from ${v.clinicName}.\n\n` : ''}- ${v.clinicName}`
      return { subject, html, text }
    }
    default:
      throw new Error(`Unknown template: ${name}`)
  }
}
