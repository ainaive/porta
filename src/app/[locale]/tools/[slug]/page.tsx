import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ResourceDetailHeader } from '@/components/resource/detail-header'
import { Markdown } from '@/components/resource/markdown'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n/routing'
import { getPublishedBySlug } from '@/lib/content'
import { requireSession } from '@/lib/session'
import { toolMeta } from '@/modules/tool-shelf/module'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const resource = await getPublishedBySlug('tool', slug, locale)
  return { title: resource?.title }
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  await requireSession(`/${locale}/tools/${slug}`)

  const resource = await getPublishedBySlug('tool', slug, locale)
  if (!resource) notFound()

  const meta = toolMeta.safeParse(resource.meta).data ?? {}
  const t = await getTranslations('tool-shelf')

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <ResourceDetailHeader resource={resource} />
      {meta.url || meta.docsUrl ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {meta.url ? (
            <Button asChild>
              <a href={meta.url} target="_blank" rel="noreferrer">
                {t('openTool')}
              </a>
            </Button>
          ) : null}
          {meta.docsUrl ? (
            <Button asChild variant="outline">
              <a href={meta.docsUrl} target="_blank" rel="noreferrer">
                {t('documentation')}
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="mt-8">
        <Markdown>{resource.body}</Markdown>
      </div>
    </main>
  )
}
