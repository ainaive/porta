import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ResourceDetailHeader } from '@/components/resource/detail-header'
import { Markdown } from '@/components/resource/markdown'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getPublishedBySlug, listChapters } from '@/lib/content'
import { courseMeta } from '@/lib/resource-meta'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const resource = await getPublishedBySlug('course', slug, locale)
  return { title: resource?.title }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  await requireSession(`/${locale}/courses/${slug}`)

  const resource = await getPublishedBySlug('course', slug, locale)
  if (!resource) notFound()

  const [chapters, t, tCommon] = await Promise.all([
    listChapters(resource.id, locale),
    getTranslations('sections'),
    getTranslations('common'),
  ])
  const meta = courseMeta.safeParse(resource.meta).data

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <ResourceDetailHeader resource={resource} />

      {meta?.level || meta?.estimatedHours ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {[
            meta.level ? `${t('level')}: ${t(`levels.${meta.level}`)}` : null,
            meta.estimatedHours
              ? t('estimatedHours', { hours: meta.estimatedHours })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}

      <div className="mt-6">
        <Markdown>{resource.body}</Markdown>
      </div>

      <h2 className="mt-10 text-lg font-semibold">{t('chapters')}</h2>
      <ol className="mt-4 divide-y rounded-lg border">
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <Link
              href={`/courses/${slug}/${chapter.position}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-accent"
            >
              <span className="w-8 text-sm text-muted-foreground tabular-nums">
                {chapter.position}
              </span>
              <span className="flex-1">{chapter.title}</span>
              {chapter.isFallback ? (
                <Badge variant="outline" className="font-normal">
                  {tCommon('untranslated')}
                </Badge>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  )
}
