import { routing } from '@/i18n/routing'

// Resource detail pages and the whole admin area require sign-in; listings
// stay public. Keep in sync with docs/architecture.md's gating tiers.
const GATED = [/^\/(tools|courses|videos|models)\/.+/, /^\/admin(\/|$)/]

export function splitLocale(pathname: string): {
  locale: string
  bare: string
} {
  const segments = pathname.split('/')
  const hasLocalePrefix = (routing.locales as readonly string[]).includes(
    segments[1],
  )
  return {
    locale: hasLocalePrefix ? segments[1] : routing.defaultLocale,
    bare: hasLocalePrefix ? `/${segments.slice(2).join('/')}` : pathname,
  }
}

export function isGatedPath(pathname: string): boolean {
  const { bare } = splitLocale(pathname)
  return GATED.some((pattern) => pattern.test(bare))
}
