import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { Palette, ShieldCheck, Mail, ChevronRight, Compass } from 'lucide-react'
// v7.6: per-admin onboarding tour restart.
import { StartTourButton } from '@/components/onboarding/StartTourButton'

export default async function SettingsIndex() {
  await requireAdmin()

  const cards = [
    { href: '/admin/settings/branding', icon: Palette,     title: 'Branding', desc: 'Portal name, logo, colours, footer' },
    { href: '/admin/settings/security', icon: ShieldCheck, title: 'Security', desc: 'Two-factor authentication requirements' },
    { href: '/admin/settings/email',    icon: Mail,        title: 'Email',    desc: 'SMTP provider and templates' },
  ]

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-neutral-500">Configure your portal.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-center gap-3 hover:border-brand/40 transition group"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold">{title}</span>
              <span className="block text-xs text-neutral-500">{desc}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-brand transition" />
          </Link>
        ))}
      </div>

      {/* v7.6/7.7: Help & onboarding */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Compass className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold">Help &amp; onboarding</h2>
            <p className="text-xs text-neutral-500">
              Re-run the guided setup tour. This only affects your own account.
            </p>
          </div>
        </div>
        <div>
          <StartTourButton />
        </div>
      </div>
    </div>
  )
}
