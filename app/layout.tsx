import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { currentUser } from '@/lib/auth'
import { getBranding, hexToRgbTriplet } from '@/lib/branding'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const b = getBranding()
  return {
    title: b.portal_name,
    description: b.tagline,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: b.portal_name },
    icons: b.favicon_filename
      ? { icon: '/api/branding/favicon' }
      : undefined,
  }
}

export function generateViewport(): Viewport {
  const b = getBranding()
  return {
    themeColor: b.brand_color,
    width: 'device-width',
    initialScale: 1,
  }
}

const themeBootScript = `
(function(){
  try {
    var t = document.documentElement.dataset.theme || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`.trim()

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  const theme = user?.theme_preference || 'system'
  const b = getBranding()
  const brandRgb = hexToRgbTriplet(b.brand_color)
  const brandDarkRgb = hexToRgbTriplet(b.brand_color_dark)

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `:root{--brand-rgb:${brandRgb};--brand-dark-rgb:${brandDarkRgb};}`,
        }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
