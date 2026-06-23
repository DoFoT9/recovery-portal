import { redirect } from 'next/navigation'
import { setupIsOpen } from '@/lib/setup'
import SetupWizard from './SetupWizard'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  if (!setupIsOpen()) {
    redirect('/login')
  }
  return <SetupWizard />
}
