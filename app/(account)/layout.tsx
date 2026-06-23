import { requireUser } from '@/lib/auth'
import { Nav } from '@/components/shared/Nav'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { Footer } from '@/components/shared/Footer'
import { getBranding } from '@/lib/branding'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const b = getBranding()
  return (
    <ThemeProvider>
      <Nav
        variant={user.role === 'admin' ? 'admin' : 'client'}
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
