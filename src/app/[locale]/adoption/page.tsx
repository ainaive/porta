import { getTranslations } from 'next-intl/server'
import { getAdoptionStats } from '@/core/content/queries'
import { sectionTitleKey } from '@/core/module/derive'
import type { Locale } from '@/i18n/routing'

// Public, and dynamic for the same reason every content route is: it reads
// the catalog (ADR 0005 — no database at build time).
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  await params
  const t = await getTranslations('adoption')
  return { title: t('title') }
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

export default async function AdoptionPage() {
  const [t, label, stats] = await Promise.all([
    getTranslations('adoption'),
    getTranslations(),
    getAdoptionStats(),
  ])

  // Sections with nothing published say nothing useful about coverage.
  const sections = stats.sections.filter((s) => s.published > 0)
  const untranslated = stats.published - stats.bilingual

  const headline = [
    { label: t('stats.published'), value: String(stats.published) },
    { label: t('stats.sections'), value: String(sections.length) },
    {
      label: t('stats.bilingual'),
      value: `${percent(stats.bilingual, stats.published)}%`,
    },
    { label: t('stats.tags'), value: String(stats.tags.length) },
  ]

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">{t('description')}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {headline.map((stat) => (
          <div key={stat.label} className="border p-6">
            <div className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
              {stat.label}
            </div>
            <div className="mt-3 font-mono text-3xl font-semibold tracking-tight">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-mono text-[13px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {t('coverage.title')}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {t('coverage.description')}
      </p>
      {sections.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="mt-6 border">
          {sections.map((section) => {
            const share = percent(section.bilingual, section.published)
            return (
              <div
                key={section.type}
                className="grid grid-cols-[minmax(7rem,12rem)_1fr_3rem_5rem] items-center gap-4 border-b px-5 py-3.5 last:border-b-0"
              >
                <div className="text-sm font-medium">
                  {label(sectionTitleKey(section.type))}
                </div>
                <div className="h-2 bg-muted">
                  <div
                    className="h-2 bg-brand"
                    style={{ width: `${share}%` }}
                  />
                </div>
                <div className="text-right font-mono text-xs tabular-nums">
                  {share}%
                </div>
                <div className="text-right font-mono text-[11px] text-muted-foreground tabular-nums">
                  {t('ofPublished', {
                    bilingual: section.bilingual,
                    published: section.published,
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <h2 className="mt-14 font-mono text-[13px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {t('gaps.title')}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="border p-6">
          <div className="text-sm font-medium">{t('gaps.untranslated')}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('gaps.untranslatedDescription')}
          </p>
          <div className="mt-4 font-mono text-2xl">{untranslated}</div>
        </div>
        <div className="border p-6">
          <div className="text-sm font-medium">{t('gaps.untagged')}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('gaps.untaggedDescription')}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {stats.tags.slice(0, 12).map((tag) => (
              <span
                key={tag.tag}
                className="border px-2 py-0.5 font-mono text-[11px]"
              >
                {tag.tag}
                <span className="ml-1.5 opacity-60">{tag.count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
