import Link from 'next/link'

interface FooterProps {
  clinicName: string | null
  contact: string | null
  abn: string | null
  supportUrl: string | null
}

export function Footer({ clinicName, contact, abn, supportUrl }: FooterProps) {
  const anyContent = clinicName || contact || abn || supportUrl
  if (!anyContent) return null
  return (
    <footer className="mt-12 border-t border-neutral-200 dark:border-neutral-800 py-6 px-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
      <div className="max-w-4xl mx-auto space-y-1">
        {clinicName && <p className="font-medium text-neutral-700 dark:text-neutral-300">{clinicName}</p>}
        {contact && <p>{contact}</p>}
        {abn && <p>ABN {abn}</p>}
        {supportUrl && (
          <p>
            <Link href={supportUrl} target="_blank" className="text-brand hover:underline">
              Support
            </Link>
          </p>
        )}
      </div>
    </footer>
  )
}
