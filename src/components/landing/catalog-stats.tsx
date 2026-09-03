import { getTranslations } from 'next-intl/server'
import type { AdoptionStats } from '@/core/content/queries'
import { Link } from '@/i18n/navigation'
import { BandHeading } from './section'

/** The design's four-up stat block. Its own numbers are quarterly telemetry —
 *  CLI users, median CI time, sessions run — which do not exist here, so these
 *  count the catalog instead and say so by linking at the Adoption page rather
 *  than at a report nobody produces. */
export async function CatalogStats({ stats }: { stats: AdoptionStats }) {
  const [t, adoption] = await Promise.all([
    getTranslations('home'),
    getTranslations('adoption'),
  ])
  const withContent = stats.sections.filter((s) => s.published > 0)
  const bilingual =
    stats.published === 0
      ? 0
      : Math.round((stats.bilingual / stats.published) * 100)

  const cells = [
    { value: String(stats.published), label: adoption('stats.published') },
    { value: String(withContent.length), label: adoption('stats.sections') },
    { value: `${bilingual}%`, label: adoption('stats.bilingual') },
    { value: String(stats.tags.length), label: adoption('stats.tags') },
  ]

  return (
    <div>
      <BandHeading>{t('atAGlance')}</BandHeading>
      <div className="grid grid-cols-2 gap-3">
        {cells.map((cell) => (
          <div key={cell.label} className="border bg-card px-5 py-5.5">
            <div className="font-mono text-[30px] leading-none font-semibold tracking-[-0.02em]">
              {cell.value}
            </div>
            <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
              {cell.label}
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/adoption"
        className="mt-4 inline-block text-[13px] text-brand hover:underline"
      >
        {t('allMetrics')} →
      </Link>
    </div>
  )
}
