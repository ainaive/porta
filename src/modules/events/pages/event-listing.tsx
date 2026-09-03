import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { listPublished } from '@/core/content/queries'
import { sectionDescriptionKey, sectionTitleKey } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { eventDayMonth, eventWhen } from '@/lib/event-date'
import { firstParam } from '@/lib/utils'
import { eventMeta } from '../module'

/** Events renders its own listing rather than one of core's layouts: an
 *  agenda is ordered by date and grouped into upcoming and past, and none of
 *  core's layouts know what a date is. The `date` field is a `YYYY-MM-DD`
 *  string precisely so this can sort and compare it as text. */
export default async function EventListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const kind = firstParam(sp.kind)

  const [t, common, label, result] = await Promise.all([
    getTranslations('events'),
    getTranslations('common'),
    getTranslations(),
    listPublished('event', locale, {}),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const dated = result.items
    .map((item) => ({ item, meta: eventMeta.safeParse(item.meta).data }))
    .filter((row) => !kind || row.meta?.kind === kind)
    .sort((a, b) => (a.meta?.date ?? '').localeCompare(b.meta?.date ?? ''))

  const upcoming = dated.filter((row) => (row.meta?.date ?? '') >= today)
  const past = dated.filter((row) => (row.meta?.date ?? '') < today).reverse()

  const kinds = ['office-hours', 'workshop', 'clinic', 'review'] as const

  return (
    <main className="mx-auto w-full max-w-[69rem] flex-1 px-7 py-16 sm:px-12">
      <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.028em]">
        {label(sectionTitleKey('event'))}
      </h1>
      <p className="mt-2.5 max-w-[38em] text-[17px] leading-relaxed text-muted-foreground text-pretty">
        {label(sectionDescriptionKey('event'))}
      </p>

      <div className="mt-9 flex flex-wrap gap-2">
        <Link href="/events">
          <Badge variant={kind ? 'outline' : 'default'}>{t('allKinds')}</Badge>
        </Link>
        {kinds.map((value) => (
          <Link
            key={value}
            href={{ pathname: '/events', query: { kind: value } }}
          >
            <Badge variant={kind === value ? 'default' : 'outline'}>
              {t(`kinds.${value}`)}
            </Badge>
          </Link>
        ))}
      </div>

      {dated.length === 0 ? (
        <p className="mt-8 border py-16 text-center text-muted-foreground">
          {label('content.empty')}
        </p>
      ) : null}

      {[
        { key: 'upcoming', rows: upcoming },
        { key: 'past', rows: past },
      ].map(({ key, rows }) =>
        rows.length === 0 ? null : (
          <section key={key} className="mt-9">
            <h2 className="mb-4 font-mono text-[13px] font-semibold tracking-[0.1em] text-label uppercase">
              {t(key === 'upcoming' ? 'upcoming' : 'past')}
            </h2>
            <div className="border bg-card">
              {rows.map(({ item, meta }) => {
                const { day, month } = eventDayMonth(item.meta, locale)
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 items-center gap-5 border-b px-5 py-5 transition-colors last:border-b-0 hover:bg-surface-hover sm:grid-cols-[4.625rem_minmax(0,1fr)_minmax(8.75rem,10.625rem)_minmax(6rem,7.5rem)]"
                  >
                    <div className="font-mono sm:border-r sm:pr-5">
                      <div className="text-[26px] leading-none font-medium">
                        {day}
                      </div>
                      <div className="mt-1.5 text-[10px] tracking-[0.1em] text-faint uppercase">
                        {month}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <Link
                        href={`/events/${item.slug}`}
                        className="text-base font-semibold tracking-[-0.01em] text-pretty hover:text-brand"
                      >
                        {item.title}
                      </Link>
                      <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">
                        {item.summary}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1 font-mono text-[11.5px] text-label [overflow-wrap:anywhere]">
                      <span>{eventWhen(item.meta)}</span>
                      {meta?.kind ? (
                        <span className="text-brand">
                          {t(`kinds.${meta.kind}`)}
                        </span>
                      ) : null}
                      {item.isFallback ? (
                        <span>{common('untranslated')}</span>
                      ) : null}
                    </div>
                    {meta?.registerUrl && key === 'upcoming' ? (
                      <a
                        href={meta.registerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-foreground px-4 py-2 text-center text-[13px] font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        {t('register')}
                      </a>
                    ) : (
                      <span />
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ),
      )}
    </main>
  )
}
