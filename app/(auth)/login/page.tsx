import { getBranding } from '@/lib/branding'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const b = getBranding()
  return (
    <LoginForm
      portalName={b.portal_name}
      tagline={b.tagline}
      hasLogo={!!b.logo_filename}
      footerClinicName={b.footer_clinic_name}
    />
  )
}
