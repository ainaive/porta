import { getTranslations } from 'next-intl/server'
import type { TranslatedResource } from '@/core/content/queries'
import { getSection } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import { BandHeading, LandingSection } from './section'

/** "Start here" — the design's four numbered path cards.
 *
 *  Fed by the published tracks rather than by a hand-written list: a track is
 *  already a task-shaped route through the toolchain, which is exactly what
 *  the design's cards describe. Nothing published means nothing to start
 *  with, so the band is suppressed rather than shown empty. */
export async function PathCards({
  tracks,
  meta,
}: {
  tracks: TranslatedResource[]
  meta: (resource: TranslatedResource) => string | null
}) {
  if (tracks.length === 0) return null
  const t = await getTranslations('home')
  const section = getSection('track')

  return (
    <LandingSection>
      <BandHeading moreHref={section.path} moreLabel={t('allPaths')}>
        {t('pathsTitle')}
      </BandHeading>
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(15.5rem,1fr))]">
        {tracks.map((track, index) => (
          <Link
            key={track.id}
            href={`${section.path}/${track.slug}`}
            className="flex min-h-[11.625rem] flex-col gap-2.5 border bg-card p-6 transition-colors hover:border-brand-3 hover:bg-surface-hover"
          >
            <span className="font-mono text-[11px] text-brand">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.01em]">
              {track.title}
            </span>
            <span className="text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
              {track.summary}
            </span>
            <span className="mt-auto font-mono text-[11px] text-faint">
              {meta(track)}
            </span>
          </Link>
        ))}
      </div>
    </LandingSection>
  )
}
