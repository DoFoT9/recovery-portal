import { getBranding } from '@/lib/branding'
import { oidcConfig, ssoEnforcedForAdmins, ssoProviderName } from '@/lib/oidc'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const b = getBranding()
  const sp = await searchParams
  const ssoError = typeof sp?.sso === 'string' ? sp.sso : null
  const ssoOn = !!oidcConfig()
  return (
    <LoginForm
      portalName={b.portal_name}
      tagline={b.tagline}
      hasLogo={!!b.logo_filename}
      footerClinicName={b.footer_clinic_name}
      sso={ssoOn ? { provider: ssoProviderName(), enforced: ssoEnforcedForAdmins() } : null}
      ssoError={ssoError}
    />
  )
}
