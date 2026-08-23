import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { AccessCta } from '@/components/landing/access-cta'
import { Bento } from '@/components/landing/bento'
import { Hero } from '@/components/landing/hero'
import { PreviewMock } from '@/components/landing/preview-mock'
import { ResourceCard } from '@/components/resource/card'
import { getHomeOverview } from '@/core/content/queries'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/metadata'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// The landing carries its own canonical rather than inheriting one from the
// layout — see the note there on why a layout-level canonical would be wrong
// for every other page.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const [home, common] = await Promise.all([
    getTranslations({ locale, namespace: 'home' }),
    getTranslations({ locale, namespace: 'common' }),
  ])
  const appName = common('appName')
  return {
    // `absolute`, or the layout's `%s · appName` template would render the
    // landing's own title as "appName · appName".
    title: { absolute: appName },
    ...pageMetadata({
      title: appName,
      description: home('subtitle'),
      siteName: appName,
      path: '',
      locale,
    }),
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const [t, overview, session] = await Promise.all([
    getTranslations('content'),
    getHomeOverview(locale),
    // React-cached; the header already asked, so this costs nothing.
    getSession(),
  ])

  return (
    // The dark token scope is opened by ChromeShell around the whole tree, so
    // the header and footer darken with the page instead of floating above it.
    //
    // `overflow-x-clip`, not `-hidden`: the ambient glows extend past the
    // viewport edge and have to be clipped, but `hidden` on one axis computes
    // the other to `auto`, which turns this into a viewport-height scroll
    // container and stops the page scrolling at all. `clip` is exempt.
    <div className="flex-1 overflow-x-clip">
      <Hero signedIn={session !== null}>
        <PreviewMock locale={locale} items={overview.latest} />
      </Hero>

      <Bento overview={overview} />

      {overview.latest.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:pb-32">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {t('latest')}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.latest.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </section>
      ) : null}

      <AccessCta signedIn={session !== null} />
    </div>
  )
}
