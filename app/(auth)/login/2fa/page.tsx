import { redirect } from 'next/navigation'
import { readChallengeCookie } from '@/lib/totp-cookies'
import { getBranding } from '@/lib/branding'
import TwoFactorChallengeForm from './TwoFactorChallengeForm'

export default async function TwoFactorChallengePage() {
  const userId = await readChallengeCookie()
  if (!userId) redirect('/login')
  const b = getBranding()
  return (
    <TwoFactorChallengeForm
      portalName={b.portal_name}
      hasLogo={!!b.logo_filename}
    />
  )
}
