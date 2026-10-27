import { requireAdmin } from '@/lib/auth'
import { AdminShell } from '@/components/admin/AdminShell'
import UnreadTitle from '@/components/UnreadTitle'
import { getBranding } from '@/lib/branding'
import { isTwoFactorRequired, hasTwoFactorEnabled } from '@/lib/totp'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
// v7.6: admin onboarding spotlight tour (auto-launches on first login).
import { TourProvider } from '@/components/onboarding/TourProvider'
import { getOnboardingComplete } from '@/lib/onboarding'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()
  const b = getBranding()
  if (isTwoFactorRequired(user) && !hasTwoFactorEnabled(user.id)) {
    const h = await headers()
    const pathname = h.get('x-pathname') || ''
    if (!pathname.startsWith('/account/2fa')) {
      redirect('/account/2fa')
    }
  }
  const onboardingComplete = getOnboardingComplete(user.id)
  return (
    <AdminShell
      currentTheme={user.theme_preference}
      portalName={b.portal_name}
      hasLogo={!!b.logo_filename}
      footer={{
        clinicName: b.footer_clinic_name,
        contact: b.footer_contact,
        abn: b.footer_abn,
        supportUrl: b.footer_support_url,
      }}
    >
      <UnreadTitle baseTitle={`${b.portal_name} · Admin`} />
      {/* v7.6: onboarding tour. Skips 2FA-enrolment pages so it can't fight the redirect. */}
      <TourProvider onboardingComplete={onboardingComplete} />
      {children}
    </AdminShell>
  )
}
