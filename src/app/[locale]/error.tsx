'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

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
