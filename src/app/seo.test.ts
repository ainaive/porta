import { describe, expect, test } from 'bun:test'
import { gatedPathPrefixes, publicPaths, sections } from '@/core/module/derive'
import { routing } from '@/i18n/routing'
import { isGatedPath, platformGatedPaths } from '@/lib/gating'
import robots from './robots'
import sitemap from './sitemap'

// Both routes derive from the module registry, so the thing worth testing is
// that the derivation cannot drift from the gate the proxy enforces. A future
// module that gates a section gets crawl rules and a sitemap entry from the
// same manifest line, or these fail.

const rules = robots().rules
const disallow = Array.isArray(rules)
  ? []
  : ((rules.disallow ?? []) as string[])

describe('robots', () => {
  // Read from gating.ts rather than spelled out again here: the point of
  // exporting platformGatedPaths is that robots and the proxy cannot disagree
  // about them, and a test with its own copy would not notice if they did.
  test('disallows every platform-gated path in every locale', () => {
    expect(platformGatedPaths.length).toBeGreaterThan(0)
    for (const path of platformGatedPaths) {
      for (const locale of routing.locales) {
        expect(disallow).toContain(`/${locale}${path}`)
        // And the proxy agrees these are gated — one source, two consumers.
        expect(isGatedPath(`/${locale}${path}`)).toBe(true)
      }
    }
  })

  test('disallows every gated prefix in every locale', () => {
    for (const prefix of gatedPathPrefixes) {
      for (const locale of routing.locales) {
        expect(disallow).toContain(`/${locale}${prefix}`)
      }
    }
  })

  test('keeps the auth API out of the crawl', () => {
    expect(disallow).toContain('/api/')
  })

  // The listing is public and is the page worth indexing; only its children
  // need a session. A prefix without the trailing slash would hide both.
  test('leaves section listings crawlable', () => {
    for (const section of sections) {
      for (const locale of routing.locales) {
        expect(disallow).not.toContain(`/${locale}${section.path}`)
      }
    }
  })
})

describe('sitemap', () => {
  const BASE = 'https://portal.example'
  const entries = (() => {
    const previous = process.env.BETTER_AUTH_URL
    process.env.BETTER_AUTH_URL = BASE
    try {
      return sitemap()
    } finally {
      process.env.BETTER_AUTH_URL = previous
    }
  })()

  const paths = entries.map((entry) => new URL(entry.url).pathname)

  test('lists the landing and every public path, once per locale', () => {
    for (const path of ['', ...publicPaths]) {
      for (const locale of routing.locales) {
        expect(paths).toContain(`/${locale}${path}`)
      }
    }
    // No duplicates, and nothing beyond what the registry declares public.
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.length).toBe((publicPaths.length + 1) * routing.locales.length)
  })

  // The landing has a nav entry of its own now that core contributes one
  // (`coreNav`), and publicPaths is derived from nav hrefs — so without the
  // filter it would arrive here as both `/en` and `/en/`, one page twice.
  test('does not list the landing twice', () => {
    expect(publicPaths).not.toContain('/')
    expect(paths.filter((path) => path === '/en')).toHaveLength(1)
  })

  // The regression this exists for: a gated URL in a sitemap sends crawlers
  // to a sign-in redirect and publishes slugs that were never public.
  test('lists nothing the proxy would gate', () => {
    for (const path of paths) {
      expect(isGatedPath(path)).toBe(false)
    }
  })

  test('cross-links the locales with hreflang', () => {
    for (const entry of entries) {
      const languages = entry.alternates?.languages ?? {}
      expect(Object.keys(languages).sort()).toEqual([...routing.locales].sort())
    }
  })

  // Every URL would otherwise be a guess at the origin.
  test('is empty rather than wrong when no canonical origin is set', () => {
    const previousUrl = process.env.BETTER_AUTH_URL
    const previousVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
    process.env.BETTER_AUTH_URL = undefined
    process.env.VERCEL_PROJECT_PRODUCTION_URL = undefined
    try {
      expect(sitemap()).toEqual([])
    } finally {
      process.env.BETTER_AUTH_URL = previousUrl
      process.env.VERCEL_PROJECT_PRODUCTION_URL = previousVercel
    }
  })
})
