import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { hasTwoFactorEnabled, countUnusedRecoveryCodes, isTwoFactorRequired } from '@/lib/totp'
import TwoFactorSettings from './TwoFactorSettings'

export default async function TwoFactorPage() {
  const user = await requireUser()
  const db = getDb()
  const row = db.prepare("select totp_enabled_at from users where id = ?").get(user.id) as { totp_enabled_at: string | null }
  const enabled = hasTwoFactorEnabled(user.id)
  const required = isTwoFactorRequired(user)
  const unusedRecovery = enabled ? countUnusedRecoveryCodes(user.id) : 0
  return (
    <TwoFactorSettings
      enabled={enabled}
      enabledAt={row?.totp_enabled_at || null}
      required={required}
      unusedRecoveryCount={unusedRecovery}
      userEmail={user.email}
    />
  )
}
