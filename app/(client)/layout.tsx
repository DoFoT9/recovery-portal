import { requireUser } from '@/lib/auth'
import { Nav } from '@/components/shared/Nav'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { Footer } from '@/components/shared/Footer'
import { getBranding } from '@/lib/branding'
import { isTwoFactorRequired, hasTwoFactorEnabled } from '@/lib/totp'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
// v7.5.2: client reply-inbox banner (flashes red on the dashboard).
import { ClientInboxBanner } from '@/components/client/ClientInboxBanner'
// v7.8: client welcome tour — auto-launches on a client's first login.
import { ClientTourProvider } from '@/components/onboarding/ClientTourProvider'
import { getOnboardingComplete } from '@/lib/onboarding'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
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
    <ThemeProvider>
      <Nav
        variant="client"
        currentTheme={user.theme_preference}
        portalName={b.portal_name}
        hasLogo={!!b.logo_filename}
      />
      <main>
        <ClientInboxBanner />
        {children}
      </main>
      {/* v7.8: welcome tour overlay (portals to body; auto-launches for new clients). */}
      <ClientTourProvider onboardingComplete={onboardingComplete} />
      <Footer
        clinicName={b.footer_clinic_name}
        contact={b.footer_contact}
        abn={b.footer_abn}
        supportUrl={b.footer_support_url}
      />
    </ThemeProvider>
  )
}
