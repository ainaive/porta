'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { errorFields, logger } from '@/lib/logger'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  // The boundary used to swallow the error entirely. Log it (with the digest
  // that correlates to the server-side entry Next emits in production) so a
  // client-side failure leaves a trace instead of a silent retry button.
  useEffect(() => {
    logger.error('route error boundary', {
      ...errorFields(error),
      digest: error.digest,
    })
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
