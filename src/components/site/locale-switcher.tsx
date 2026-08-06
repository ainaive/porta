'use client'

import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { usePathname, useRouter } from '@/i18n/navigation'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const other = locale === 'en' ? 'zh' : 'en'

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.replace(pathname, { locale: other })}
    >
      {other === 'zh' ? '中文' : 'English'}
    </Button>
  )
}
