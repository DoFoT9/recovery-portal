import type { MetadataRoute } from 'next'
import { getBranding } from '@/lib/branding'

export default function manifest(): MetadataRoute.Manifest {
  const b = getBranding()
  return {
    name: b.portal_name,
    short_name: b.portal_name.split(/\s+/)[0] || 'Portal',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: b.brand_color,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
