import { getTranslations } from 'next-intl/server'
import { CatalogStats } from '@/components/landing/catalog-stats'
import { HeroSearch } from '@/components/landing/hero-search'
import { LatestTable } from '@/components/landing/latest-table'
import { PathCards } from '@/components/landing/path-cards'
import { UpcomingEvents } from '@/components/landing/upcoming-events'
import {
  getAdoptionStats,
  getHomeOverview,
  listPublished,
  listUpcomingEvents,
  type TranslatedResource,
} from '@/core/content/queries'
import type { Locale } from '@/i18n/routing'
import { trackMeta } from '@/modules/handbook/module'

export const dynamic = 'force-dynamic'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const [overview, tracks, events, stats, handbook] = await Promise.all([
    getHomeOverview(locale, 6),
    listPublished('track', locale),
    listUpcomingEvents(locale),
    getAdoptionStats(),
    getTranslations('handbook'),
  ])

  // A track's corner label: its estimated hours, else its level, else
  // nothing — rather than an invented "~25 min" for every card.
  const trackLabel = (track: TranslatedResource): string | null => {
    const meta = trackMeta.safeParse(track.meta).data
    if (meta?.estimatedHours) {
      return handbook('estimatedHours', { hours: meta.estimatedHours })
    }
    return meta?.level ? handbook(`levels.${meta.level}`) : null
  }

  return (
    <main className="flex-1">
      {/* Most-used tags, not the alphabetical head of the list: the chips
          are meant to be the queries people actually run. */}
      <HeroSearch
        locale={locale}
        popularTags={stats.tags.slice(0, 4).map((tag) => tag.tag)}
      />
      {/* Oldest first. listPublished returns newest first, which numbers a
          curated set of tracks backwards — 01 should be where you start. */}
      <PathCards
        tracks={tracks.items.slice(0, 4).reverse()}
        meta={trackLabel}
      />
      <LatestTable items={overview.latest} />

      <section className="px-7 py-13 sm:px-12">
        <div className="mx-auto grid w-full max-w-[80rem] gap-12 [grid-template-columns:repeat(auto-fit,minmax(18.75rem,1fr))]">
          <UpcomingEvents events={events} locale={locale} />
          <CatalogStats stats={stats} />
        </div>
      </section>
    </main>
  )
}
