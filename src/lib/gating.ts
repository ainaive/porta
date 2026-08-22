import { gatedModulePatterns } from '@/core/module/derive'
import { routing } from '@/i18n/routing'

// Resource detail pages, the whole admin area, and the account page require
// sign-in; listings stay public. Keep in sync with docs/architecture.md's
// gating tiers.
//
// The per-section patterns come from the module registry, so a module gates
// its own detail pages by registering them — there is no list here to forget.

/** Gated by the platform rather than by a module: they belong to no module's
 *  vertical slice. Exported because robots.txt has to disallow exactly these
 *  too, and two hand-kept copies of a security-relevant list is one too many. */
export const platformGatedPaths = ['/admin', '/account'] as const

/** Public, but kept out of search engines — crawl policy, not access control,
 *  and deliberately NOT part of `GATED` below: anyone may read these, a
 *  crawler simply shouldn't. `/search` qualifies because its query string is
 *  an unbounded URL space, so one indexed search link leads to endlessly
 *  many more (ADR 0016). Exported for the same reason as the list above —
 *  robots.txt has to name exactly these, and two hand-kept copies is one too
 *  many. Each page also sends its own `noindex`. */
export const platformNoIndexPaths = ['/search'] as const

const GATED = [
  ...gatedModulePatterns,
  ...platformGatedPaths.map((path) => new RegExp(`^${path}(/|$)`)),
]

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
