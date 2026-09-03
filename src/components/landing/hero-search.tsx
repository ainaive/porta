import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

/** The design's opening band: kicker, headline, and a search box that is the
 *  page's primary action.
 *
 *  A plain GET form to /search — no client component, and the main path works
 *  without JavaScript. The design's prefix cell reads `wb`, after a CLI that
 *  does not exist; this keeps the shape with the `/` the design itself uses on
 *  the catalog filter. */
export async function HeroSearch({
  locale,
  popularTags,
}: {
  locale: Locale
  popularTags: string[]
}) {
  const [t, search] = await Promise.all([
    getTranslations('home'),
    getTranslations('search'),
  ])

  return (
    <section className="border-b px-7 pt-20 pb-16 sm:px-12">
      <div className="mx-auto w-full max-w-[80rem]">
        <p className="font-mono text-[11px] tracking-[0.14em] text-brand uppercase">
          {t('kicker')}
        </p>
        <h1 className="mt-6 max-w-[15em] text-[clamp(2.25rem,5.5vw,3.625rem)] leading-[1.06] font-bold tracking-[-0.032em] text-pretty">
          {t('heroTitle')}
        </h1>
        <p className="mt-5 max-w-[34em] text-[19px] leading-relaxed text-muted-foreground text-pretty">
          {t('heroSub')}
        </p>

        <form
          action={`/${locale}/search`}
          method="get"
          className="mt-10 flex max-w-[39rem] items-stretch border-[1.5px] border-foreground bg-card"
        >
          <span
            aria-hidden
            className="flex items-center border-r border-border px-4 font-mono text-[13px] text-brand"
          >
            /
          </span>
          <input
            type="search"
            name="q"
            aria-label={search('title')}
            placeholder={t('searchPlaceholder')}
            className="min-w-0 flex-1 bg-transparent px-4 py-4 text-[15px] outline-none"
          />
          <button
            type="submit"
            className="cursor-pointer bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand"
          >
            {search('submit')}
          </button>
        </form>

        {popularTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[10.5px] tracking-[0.06em] text-faint uppercase">
              {t('popular')}
            </span>
            {popularTags.map((tag) => (
              <Link
                key={tag}
                href={{ pathname: '/search', query: { q: tag } }}
                className="border border-input bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-brand hover:text-brand"
              >
                {tag}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
