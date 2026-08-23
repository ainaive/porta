import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export default async function NotFoundPage() {
  const t = await getTranslations('errors')

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-6xl font-semibold tracking-tight text-muted-foreground">
        404
      </p>
      <h1 className="text-xl font-semibold">{t('notFoundTitle')}</h1>
      <p className="max-w-md text-muted-foreground">
        {t('notFoundDescription')}
      </p>
      <Button asChild className="mt-2">
        <Link href="/">{t('backHome')}</Link>
      </Button>
    </div>
  )
}
