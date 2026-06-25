import { getBranding } from '@/lib/branding'
import ForgotPasswordForm from './ForgotPasswordForm'

export default async function ForgotPasswordPage() {
  const b = getBranding()
  return <ForgotPasswordForm portalName={b.portal_name} hasLogo={!!b.logo_filename} />
}
