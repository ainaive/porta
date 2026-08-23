import type { Metadata } from 'next'
import { type Locale, routing } from '@/i18n/routing'

// The canonical origin, and everything derived from it: the absolute URLs in
// robots.txt and sitemap.xml, and the canonical/hreflang pair every public
// page carries. One helper so the sitemap and the pages it advertises cannot
// disagree about what a URL is.
//
// Deliberately free of better-auth, the database and next-intl: this is read
// by `generateMetadata` on every public page, and by `src/lib/auth.ts` itself.

// The canonical, absolute origin better-auth stamps into emailed links (reset,
// verify). BETTER_AUTH_URL is set on production and the self-hosted Docker
// target; it's intentionally unset on Vercel previews. Left unset, better-auth
// resolves the base per-request only on the HTTP-handler path — so admin resets
// (which call auth.api.* directly) would email a *relative* link no inbox can
// open. Falling back to the Vercel production domain keeps those links absolute
// and, better, pointed at the real deployment rather than an ephemeral preview
// (the database is shared, so the token resolves there). Returns undefined only
// when neither is set (e.g. local dev without env), matching prior behaviour.
//
// Read at call time, never at build: ADR 0005 forbids NEXT_PUBLIC_* for
// environment-dependent values, so one image can run anywhere. That is why
// robots.ts and sitemap.ts are force-dynamic, and why nothing here may be
// evaluated into a prerendered payload.
export function canonicalBaseURL(): string | undefined {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return prod ? `https://${prod}` : undefined
}

/** One locale-less public path as an absolute URL in each locale. Every URL
 *  carries its locale (ADR 0004), so the set is what hreflang cross-links. */
export function localeUrls(base: string, path: string): Record<Locale, string> {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, `${base}/${locale}${path}`]),
  ) as Record<Locale, string>
}

/** The `alternates` block for a page at a locale-less public path, or
 *  undefined when no canonical origin is configured — the same choice
 *  sitemap.ts makes by returning no entries. A relative canonical resolved
 *  against a guessed origin would be worse than none: it would tell a crawler
 *  the wrong URL is authoritative. */
export type LocaleAlternates = {
  canonical: string
  languages: Record<Locale, string>
}

export function localeAlternates(
  path: string,
  locale: Locale,
): LocaleAlternates | undefined {
  const base = canonicalBaseURL()
  if (!base) return undefined
  const languages = localeUrls(base, path)
  return { canonical: languages[locale], languages }
}

// Open Graph wants language_TERRITORY; a URL prefix is a bare subtag (ADR
// 0004). Mapped here rather than in routing.ts so an Open Graph detail stays
// out of the locale definition — and typed against `Locale`, so adding a
// locale to the routing config fails the typecheck here until someone
// decides what its territory is.
const OG_LOCALE: Record<Locale, string> = { en: 'en_US', zh: 'zh_CN' }

/** What every public page says about itself beyond its title: the description
 *  a crawler indexes, where the page canonically lives, and the unfurl an
 *  internal chat client renders when someone pastes the link.
 *
 *  `title` is the caller's, not returned here: the root layout needs a
 *  `{ default, template }` pair while a page needs a plain string, and only
 *  the caller knows which. Both feed the same string to `openGraph`.
 *
 *  Pure — takes resolved strings rather than message keys, so it stays out of
 *  next-intl's server scope and can be unit-tested without a request. */
export function pageMetadata(opts: {
  title: string
  description: string
  siteName: string
  /** Locale-less, e.g. '/tools'. The landing is ''. */
  path: string
  locale: Locale
}): Pick<Metadata, 'description' | 'alternates' | 'openGraph' | 'twitter'> {
  const alternates = localeAlternates(opts.path, opts.locale)
  return {
    description: opts.description,
    alternates,
    openGraph: {
      type: 'website',
      siteName: opts.siteName,
      title: opts.title,
      description: opts.description,
      locale: OG_LOCALE[opts.locale],
      // Absent rather than relative when no origin is configured, for the
      // same reason as the canonical above.
      url: alternates?.canonical ?? undefined,
    },
    // `summary`, not `summary_large_image`: nothing here ships an image yet,
    // and the large card degrades to a blank slab without one.
    twitter: {
      card: 'summary',
      title: opts.title,
      description: opts.description,
    },
  }
}
