import type { MetadataRoute } from 'next'
import { publicPaths } from '@/core/module/derive'
import { routing } from '@/i18n/routing'
import { canonicalBaseURL } from '@/lib/auth'

// The public surface, straight from the module registry: the landing, each
// module's index, each section's listing — once per locale, cross-linked with
// hreflang because every URL carries its locale (ADR 0004) and the two are
// the same page in different languages.
//
// Deliberately no resource detail pages. They require a session, so listing
// them would send crawlers to a sign-in redirect and publish slugs that are
// not public. That also keeps this route free of the database, so it never
// becomes a scan of every published row on a crawler's schedule.
//
// /search is absent for free rather than by exclusion: `publicPaths` is
// derived from nav entries and section paths, and search is neither. Nothing
// here needs to filter it out — and nothing here should start listing it
// (ADR 0016).

// Dynamic for the same reason as robots.ts: the canonical origin comes from
// runtime server env, and prerendering would bake in the build's idea of it —
// empty for the container target, which is handed BETTER_AUTH_URL at run time.
export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = canonicalBaseURL()
  // Without a canonical origin every URL here would be a guess. An empty
  // sitemap says "nothing to add", which is true, rather than something false.
  if (!base) return []

  const paths = ['', ...publicPaths]
  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alt) => [alt, `${base}/${alt}${path}`]),
        ),
      },
    })),
  )
}
