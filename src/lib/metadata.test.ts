import { describe, expect, test } from 'bun:test'
import { routing } from '@/i18n/routing'
import {
  canonicalBaseURL,
  localeAlternates,
  localeUrls,
  pageMetadata,
} from './metadata'

// The origin is read from env at call time (ADR 0005), so these set it the
// way seo.test.ts does rather than importing a constant.
const BASE = 'https://portal.example'

function withEnv<T>(
  env: { authUrl?: string; vercelHost?: string },
  run: () => T,
): T {
  const previousUrl = process.env.BETTER_AUTH_URL
  const previousVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  process.env.BETTER_AUTH_URL = env.authUrl
  process.env.VERCEL_PROJECT_PRODUCTION_URL = env.vercelHost
  try {
    return run()
  } finally {
    process.env.BETTER_AUTH_URL = previousUrl
    process.env.VERCEL_PROJECT_PRODUCTION_URL = previousVercel
  }
}

const withOrigin = <T>(authUrl: string | undefined, run: () => T): T =>
  withEnv({ authUrl }, run)

describe('canonicalBaseURL', () => {
  test('prefers BETTER_AUTH_URL over the Vercel production domain', () => {
    withEnv({ authUrl: BASE, vercelHost: 'ignored.vercel.app' }, () => {
      expect(canonicalBaseURL()).toBe(BASE)
    })
  })

  test('falls back to the Vercel production domain as https', () => {
    withEnv({ vercelHost: 'porta.vercel.app' }, () => {
      expect(canonicalBaseURL()).toBe('https://porta.vercel.app')
    })
  })

  test('is undefined when neither is set', () => {
    withEnv({}, () => {
      expect(canonicalBaseURL()).toBeUndefined()
    })
  })
})

describe('localeUrls', () => {
  test('gives one absolute URL per locale, prefixed with it', () => {
    const urls = localeUrls(BASE, '/tools')
    expect(Object.keys(urls).sort()).toEqual([...routing.locales].sort())
    for (const locale of routing.locales) {
      expect(urls[locale]).toBe(`${BASE}/${locale}/tools`)
    }
  })

  // The landing is the empty path; it must not come out as `${BASE}/en/`.
  test('renders the landing without a trailing slash', () => {
    expect(localeUrls(BASE, '')).toMatchObject({ en: `${BASE}/en` })
  })
})

describe('localeAlternates', () => {
  test('claims the requested locale and cross-links the others', () => {
    withOrigin(BASE, () => {
      const alternates = localeAlternates('/help/courses', 'zh')
      expect(alternates?.canonical).toBe(`${BASE}/zh/help/courses`)
      expect(alternates?.languages).toMatchObject({
        en: `${BASE}/en/help/courses`,
        zh: `${BASE}/zh/help/courses`,
      })
    })
  })

  // The regression this exists for: a canonical resolved against a guessed
  // origin tells a crawler the wrong URL is authoritative — strictly worse
  // than saying nothing, which is the choice sitemap.ts already makes.
  test('says nothing rather than guessing when no origin is set', () => {
    withOrigin(undefined, () => {
      expect(localeAlternates('/tools', 'en')).toBeUndefined()
    })
  })
})

describe('pageMetadata', () => {
  test('carries the description, the canonical and the unfurl', () => {
    withOrigin(BASE, () => {
      const meta = pageMetadata({
        title: 'Tool Shelf',
        description: 'Internal and ecosystem tools.',
        siteName: 'Silicon Ecosystem',
        path: '/tools',
        locale: 'en',
      })
      expect(meta.description).toBe('Internal and ecosystem tools.')
      expect(meta.alternates?.canonical).toBe(`${BASE}/en/tools`)
      expect(meta.openGraph).toMatchObject({
        title: 'Tool Shelf',
        siteName: 'Silicon Ecosystem',
        url: `${BASE}/en/tools`,
      })
      expect(meta.twitter).toMatchObject({ card: 'summary' })
    })
  })

  // og:locale is language_TERRITORY, not the bare subtag a URL prefix uses.
  test('translates the URL locale into an Open Graph one', () => {
    withOrigin(BASE, () => {
      for (const [locale, expected] of [
        ['en', 'en_US'],
        ['zh', 'zh_CN'],
      ] as const) {
        const meta = pageMetadata({
          title: 't',
          description: 'd',
          siteName: 's',
          path: '',
          locale,
        })
        expect(meta.openGraph).toMatchObject({ locale: expected })
      }
    })
  })

  test('omits og:url along with the canonical when there is no origin', () => {
    withOrigin(undefined, () => {
      const meta = pageMetadata({
        title: 't',
        description: 'd',
        siteName: 's',
        path: '/tools',
        locale: 'en',
      })
      expect(meta.alternates).toBeUndefined()
      expect(meta.openGraph).toMatchObject({ url: undefined })
      // The description is not origin-dependent and must survive.
      expect(meta.description).toBe('d')
    })
  })
})
