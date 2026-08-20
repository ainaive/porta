import { gatedModulePatterns } from '@/core/module/derive'
import { routing } from '@/i18n/routing'

// Resource detail pages, the whole admin area, and the account page require
// sign-in; listings stay public. Keep in sync with docs/architecture.md's
// gating tiers.
//
// The per-section patterns come from the module registry, so a module gates
// its own detail pages by registering them — there is no list here to forget.
const GATED = [...gatedModulePatterns, /^\/admin(\/|$)/, /^\/account(\/|$)/]

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
