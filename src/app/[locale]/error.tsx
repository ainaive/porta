'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { errorFields, logger } from '@/lib/logger'

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  // retry() (stable in Next 16.3) re-fetches and re-renders the failed
  // subtree; reset() only clears boundary state, so a server-origin error
  // would immediately throw again.
  retry: () => void
}) {
  const t = useTranslations('errors')

  // Client-boundary failures log to the browser console (a local-dev aid);
  // server errors are captured server-side by instrumentation's
  // onRequestError. The digest correlates this with the server-side entry
  // Next emits in production.
  useEffect(() => {
    logger.error('route error boundary', {
      ...errorFields(error),
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t('errorTitle')}</h1>
      <p className="max-w-md text-muted-foreground">{t('errorDescription')}</p>
      <Button onClick={retry} className="mt-2">
        {t('retry')}
      </Button>
    </div>
  )
}
