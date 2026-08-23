import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ResourceDetailHeader } from '@/components/resource/detail-header'
import { Markdown } from '@/components/resource/markdown'
import { Button } from '@/components/ui/button'
import { getPublishedBySlug } from '@/core/content/queries'
import type { Locale } from '@/i18n/routing'
import { requireSession } from '@/lib/session'
import { guideMeta } from '../module'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const resource = await getPublishedBySlug('guide', slug, locale)
  return { title: resource?.title }
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  await requireSession(`/${locale}/help/guides/${slug}`)

  const resource = await getPublishedBySlug('guide', slug, locale)
  if (!resource) notFound()

  const meta = guideMeta.safeParse(resource.meta).data
  const t = await getTranslations('help')

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <ResourceDetailHeader resource={resource} />

      {meta?.level ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t('level')}: {t(`levels.${meta.level}`)}
        </p>
      ) : null}

      <div className="mt-6">
        <Markdown>{resource.body}</Markdown>
      </div>

      {meta?.sourceUrl ? (
        <div className="mt-8 border-t pt-6">
          <Button asChild variant="outline">
            <a href={meta.sourceUrl} target="_blank" rel="noreferrer">
              {t('source')}
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
