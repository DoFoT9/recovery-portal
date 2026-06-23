import { requireAdmin } from '@/lib/auth'
import { getBranding } from '@/lib/branding'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import BrandingForm from './BrandingForm'

export default async function BrandingSettingsPage() {
  await requireAdmin()
  const branding = getBranding()
  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-4">
      <div>
        <nav className="text-xs text-neutral-500 flex items-center gap-1" aria-label="Breadcrumb">
          <Link href="/admin/settings" className="hover:text-neutral-700 dark:hover:text-neutral-200 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Settings
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-neutral-700 dark:text-neutral-200 font-medium">Branding</span>
        </nav>
        <h1 className="text-2xl font-bold mt-1">Branding</h1>
        <p className="text-sm text-neutral-500">
          Customise how the portal appears to your clients. Changes take effect immediately.
        </p>
      </div>
      <BrandingForm initial={branding} />
    </div>
  )
}
