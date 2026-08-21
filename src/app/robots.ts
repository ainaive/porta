import type { MetadataRoute } from 'next'
import { gatedPathPrefixes } from '@/core/module/derive'
import { routing } from '@/i18n/routing'
import { canonicalBaseURL } from '@/lib/auth'
import { platformGatedPaths } from '@/lib/gating'

// Crawl rules, derived rather than listed. Every locale-prefixed form of a
// gated path is disallowed, so a module that gates a new section stops it
// being crawled by registering it — there is no second list to update, and
// the same derivation feeds the proxy's gate (src/lib/gating.ts).
//
// This is politeness, not enforcement: requireSession/requireAdmin are what
// actually keep a signed-out crawler out. What it buys is that gated URLs
// stay out of search results, where they would advertise slugs and — for
// /admin, which 404s for non-admins on purpose — the existence of an area
// that tries not to be discoverable.

// Dynamic, like every other route here, and for the same reason: the
// canonical origin is read from server env at runtime (ADR 0005). Prerendering
// this would bake in whatever BETTER_AUTH_URL happened to be at build time —
// which for the container target is nothing, since compose supplies it when
// the image runs, not when it is built.
export const dynamic = 'force-dynamic'

function everyLocale(path: string): string[] {
  return routing.locales.map((locale) => `/${locale}${path}`)
}

export default function robots(): MetadataRoute.Robots {
  const base = canonicalBaseURL()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        // Both halves come from the same place the proxy gates on — the
        // module registry, and gating.ts's platform paths.
        ...[...platformGatedPaths, ...gatedPathPrefixes].flatMap(everyLocale),
      ],
    },
    // Omitted rather than guessed when neither BETTER_AUTH_URL nor Vercel's
    // production domain is set: a sitemap line pointing at the wrong origin
    // is worse than none.
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  }
}
