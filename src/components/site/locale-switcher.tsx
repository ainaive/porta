'use client'

import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { usePathname, useRouter } from '@/i18n/navigation'
import { firstValueQuery } from '@/lib/utils'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  // usePathname excludes the query string; carry it over so switching
  // locale keeps search and tag filters.
  const searchParams = useSearchParams()
  const other = locale === 'en' ? 'zh' : 'en'

  return (
    <Button
      variant="outline"
      size="sm"
      className="font-mono text-xs"
      onClick={() => {
        const query = firstValueQuery(searchParams)
        router.replace(
          Object.keys(query).length > 0 ? { pathname, query } : pathname,
          { locale: other },
        )
      }}
    >
      {other === 'zh' ? '中文' : 'English'}
    </Button>
  )
}
