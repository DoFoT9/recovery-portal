import { requireUser } from '@/lib/auth'
import { Nav } from '@/components/shared/Nav'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { Footer } from '@/components/shared/Footer'
import { getBranding } from '@/lib/branding'
import { isTwoFactorRequired, hasTwoFactorEnabled } from '@/lib/totp'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

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

  return (
    <ThemeProvider>
      <Nav
        variant="client"
        currentTheme={user.theme_preference}
        portalName={b.portal_name}
        hasLogo={!!b.logo_filename}
      />
      <main>{children}</main>
      <Footer
        clinicName={b.footer_clinic_name}
        contact={b.footer_contact}
        abn={b.footer_abn}
        supportUrl={b.footer_support_url}
      />
    </ThemeProvider>
  )
}
