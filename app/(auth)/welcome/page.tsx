import { getBranding } from '@/lib/branding'
import WelcomeForm from './WelcomeForm'

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const b = getBranding()
  const { token } = await searchParams
  return <WelcomeForm portalName={b.portal_name} hasLogo={!!b.logo_filename} initialToken={token || ''} />
}
