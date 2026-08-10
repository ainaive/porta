'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { reportClientError } from '@/lib/client-telemetry'
import { errorFields, logger } from '@/lib/logger'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  // The boundary used to swallow the error entirely. Report it to the server
  // (so it reaches the same stdout as server errors) and mirror it to the
  // browser console for local debugging. The digest correlates to the
  // server-side entry Next emits in production.
  useEffect(() => {
    const fields = { ...errorFields(error), digest: error.digest }
    reportClientError({ message: 'route error boundary', ...fields })
    logger.error('route error boundary', fields)
  }, [error])

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t('errorTitle')}</h1>
      <p className="max-w-md text-muted-foreground">{t('errorDescription')}</p>
      <Button onClick={reset} className="mt-2">
        {t('retry')}
      </Button>
    </main>
  )
}
