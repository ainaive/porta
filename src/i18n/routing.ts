import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  // Every URL carries its locale so auth redirects and shared links are
  // always unambiguous.
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]
