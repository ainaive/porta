'use client'

import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { cn, firstValueQuery } from '@/lib/utils'

const LOCALES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'zh', label: '中文', name: '中文' },
] as const

/** A segmented control: both locales are always visible, and the active one
 *  is inverted to ink. The previous toggle showed only the language you were
 *  not in, which reads as a label rather than a choice.
 *
 *  Each cell stays a `button` named for the language it switches to — the
 *  accessible name e2e/i18n-fallback.e2e.ts asserts on. */
export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  // usePathname excludes the query string; carry it over so switching
  // locale keeps search, tag and facet filters.
  const searchParams = useSearchParams()

  return (
    <div className="flex border border-input">
      {LOCALES.map((entry, index) => {
        const active = locale === entry.code
        return (
          <button
            key={entry.code}
            type="button"
            aria-current={active ? 'true' : undefined}
            aria-label={entry.name}
            className={cn(
              'cursor-pointer px-3 py-1.5 font-mono text-[11.5px] transition-colors',
              index > 0 && 'border-l border-input',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-label hover:text-foreground',
            )}
            onClick={() => {
              if (active) return
              const query = firstValueQuery(searchParams)
              router.replace(
                Object.keys(query).length > 0 ? { pathname, query } : pathname,
                { locale: entry.code },
              )
            }}
          >
            {entry.label}
          </button>
        )
      })}
    </div>
  )
}
