import { getTranslations } from 'next-intl/server'
import { StatusBadge } from '@/components/resource/status-badge'
import type { TranslatedResource } from '@/core/content/queries'
import { findSection, sectionTitleKey } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import { BandHeading, LandingSection } from './section'

/** The design's featured table, showing the newest additions.
 *
 *  The design ranks by installs and prints a per-tool user count and an
 *  install command. There is no telemetry and no CLI, so both columns would be
 *  invented; recency is a real ordering the catalog already knows, and the
 *  third column carries the section and tags instead. */
export async function LatestTable({ items }: { items: TranslatedResource[] }) {
  if (items.length === 0) return null
  const [t, label] = await Promise.all([
    getTranslations('home'),
    getTranslations(),
  ])

  return (
    <LandingSection>
      <BandHeading moreHref="/search" moreLabel={t('allResources')}>
        {t('featuredTitle')}
      </BandHeading>
      {/* Scrolls inside its own box rather than making the page scroll
          sideways on a phone. */}
      <div className="overflow-x-auto border bg-card">
        <table className="w-full min-w-[44rem] border-collapse text-left">
          <thead>
            <tr className="border-b bg-panel font-mono text-[10px] tracking-[0.1em] text-label uppercase">
              <th className="px-5 py-3 font-normal">{t('colName')}</th>
              <th className="px-5 py-3 font-normal">{t('colWhat')}</th>
              <th className="px-5 py-3 font-normal">{t('colWhere')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              // `resources.type` is text; getHomeOverview already drops rows
              // whose section is not registered, so this is a type narrowing
              // rather than a real branch.
              const section = findSection(item.type)
              if (!section) return null
              return (
                <tr
                  key={item.id}
                  className="border-b transition-colors last:border-b-0 hover:bg-surface-hover"
                >
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`${section.path}/${item.slug}`}
                      className="text-[15px] font-semibold hover:text-brand"
                    >
                      {item.title}
                    </Link>
                    <div className="mt-1 font-mono text-[11px] text-faint">
                      {label(sectionTitleKey(section.key))}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
                    {item.summary}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge resource={item} />
                      {item.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[10.5px] text-faint"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </LandingSection>
  )
}
