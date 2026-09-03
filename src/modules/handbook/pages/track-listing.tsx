import { getTranslations } from 'next-intl/server'
import { listPublished } from '@/core/content/queries'
import { sectionDescriptionKey, sectionTitleKey } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { trackMeta } from '../module'
import { listSteps } from '../steps'

/** Getting started renders its own listing rather than one of core's layouts.
 *
 *  The design shows each track beside its steps, and steps are this module's
 *  table — core cannot read them without depending on a module, which is the
 *  rule ADR 0013 exists to hold. A module shipping the page is the supported
 *  way out: the generic factory stays generic, and this stays local. */
export default async function TrackListingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const [t, label, result] = await Promise.all([
    getTranslations('handbook'),
    getTranslations(),
    // Ascending: a set of tracks is a sequence, and listPublished returns
    // newest first, which numbers it backwards.
    listPublished('track', locale),
  ])
  const tracks = [...result.items].reverse()

  const withSteps = await Promise.all(
    tracks.map(async (track) => ({
      track,
      steps: await listSteps(track.id, locale),
      meta: trackMeta.safeParse(track.meta).data,
    })),
  )

  return (
    <main className="mx-auto w-full max-w-[66rem] flex-1 px-7 py-16 sm:px-12">
      <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-[-0.028em]">
        {label(sectionTitleKey('track'))}
      </h1>
      <p className="mt-2.5 max-w-[38em] text-[17px] leading-relaxed text-muted-foreground text-pretty">
        {label(sectionDescriptionKey('track'))}
      </p>

      {/* The design opens with a dark terminal block running an install
          script for a CLI that does not exist. The block earns its place as
          the "before you start" note; what it says is the real first step,
          which is getting an account (ADR 0002). */}
      <div className="mt-12 mb-13 border border-foreground bg-foreground px-7 py-6.5 text-background">
        <div className="font-mono text-[10.5px] tracking-[0.12em] text-brand-3 uppercase">
          {t('stepZero.kicker')}
        </div>
        <ol className="mt-3.5 list-none font-mono text-[14px] leading-loose">
          {['request', 'signIn', 'browse'].map((step, index) => (
            <li key={step}>
              <span className="text-brand-3">{index + 1}.</span>{' '}
              {t(`stepZero.${step}`)}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] leading-relaxed text-faint">
          {t('stepZero.note')}
        </p>
      </div>

      {withSteps.length === 0 ? (
        <p className="border py-16 text-center text-muted-foreground">
          {label('content.empty')}
        </p>
      ) : (
        withSteps.map(({ track, steps, meta }, index) => (
          <div
            key={track.id}
            className="grid gap-10 border-t py-9 sm:grid-cols-[minmax(12.5rem,18.75rem)_minmax(0,1fr)]"
          >
            <div>
              <div className="font-mono text-[11px] text-brand">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.018em]">
                <Link
                  href={`/start/${track.slug}`}
                  className="hover:text-brand"
                >
                  {track.title}
                </Link>
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
                {track.summary}
              </p>
              <div className="mt-3 font-mono text-[11px] text-faint">
                {[
                  meta?.estimatedHours
                    ? t('estimatedHours', { hours: meta.estimatedHours })
                    : null,
                  meta?.level ? t(`levels.${meta.level}`) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <ol className="flex list-none flex-col">
              {steps.map((step) => (
                <li
                  key={step.id}
                  className="grid grid-cols-[2rem_1fr] items-baseline gap-3.5 border-b py-4 last:border-b-0"
                >
                  <span className="font-mono text-xs text-faint">
                    {String(step.position).padStart(2, '0')}
                  </span>
                  <div>
                    <Link
                      href={`/start/${track.slug}/${step.position}`}
                      className="text-[14.5px] font-medium hover:text-brand"
                    >
                      {step.title}
                    </Link>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground text-pretty">
                      {step.body.split('\n')[0]}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
    </main>
  )
}
