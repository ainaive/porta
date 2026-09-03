import { getTranslations } from 'next-intl/server'
import type { TranslatedResource } from '@/core/content/queries'
import { getSection } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import { eventDayMonth, eventWhen } from '@/lib/event-date'
import { BandHeading } from './section'

/** "Next up" — the soonest published sessions. Suppressed entirely when
 *  nothing is scheduled, which is honest: an events column with no events is
 *  worse than no column. */
export async function UpcomingEvents({
  events,
  locale,
}: {
  events: TranslatedResource[]
  locale: string
}) {
  if (events.length === 0) return null
  const t = await getTranslations('home')
  const section = getSection('event')

  return (
    <div>
      <BandHeading moreHref={section.path} moreLabel={t('allEvents')}>
        {t('nextUp')}
      </BandHeading>
      {events.map((event) => {
        const { day, month } = eventDayMonth(event.meta, locale)
        return (
          <Link
            key={event.id}
            href={`${section.path}/${event.slug}`}
            className="flex gap-5 border-t py-4.5 transition-colors hover:bg-surface-hover"
          >
            <div className="w-12 shrink-0 text-center font-mono">
              <div className="text-[22px] leading-none font-medium">{day}</div>
              <div className="mt-1 text-[10px] tracking-[0.1em] text-faint uppercase">
                {month}
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="text-[15px] font-semibold">{event.title}</div>
              <div className="font-mono text-[12.5px] text-label">
                {eventWhen(event.meta)}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
