import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { Palette, ShieldCheck, ChevronRight } from 'lucide-react'

export default async function SettingsIndex() {
  await requireAdmin()
  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-neutral-500">Configure your portal.</p>
      </div>
      <div className="space-y-2">
        <Link href="/admin/settings/branding" className="card flex items-center gap-3 hover:border-brand transition">
          <Palette className="h-5 w-5 text-brand" />
          <div className="flex-1">
            <div className="font-semibold">Branding</div>
            <div className="text-xs text-neutral-500">Portal name, logo, colours, footer</div>
          </div>
          <ChevronRight className="h-4 w-4 text-neutral-400" />
        </Link>
        <Link href="/admin/settings/security" className="card flex items-center gap-3 hover:border-brand transition">
          <ShieldCheck className="h-5 w-5 text-brand" />
          <div className="flex-1">
            <div className="font-semibold">Security</div>
            <div className="text-xs text-neutral-500">Two-factor authentication requirements</div>
          </div>
          <ChevronRight className="h-4 w-4 text-neutral-400" />
        </Link>
      </div>
    </div>
  )
}
