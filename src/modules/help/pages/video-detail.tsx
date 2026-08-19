import { notFound } from 'next/navigation'
import { ResourceDetailHeader } from '@/components/resource/detail-header'
import { Markdown } from '@/components/resource/markdown'
import { getPublishedBySlug } from '@/core/content/queries'
import type { Locale } from '@/i18n/routing'
import { requireSession } from '@/lib/session'
import { videoMeta } from '../module'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const resource = await getPublishedBySlug('video', slug, locale)
  return { title: resource?.title }
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  await requireSession(`/${locale}/videos/${slug}`)

  const resource = await getPublishedBySlug('video', slug, locale)
  if (!resource) notFound()

  const meta = videoMeta.safeParse(resource.meta).data

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <ResourceDetailHeader resource={resource} />
      {meta ? (
        <div className="mt-6 aspect-video overflow-hidden rounded-lg border bg-muted">
          <iframe
            src={meta.embedUrl}
            title={resource.title}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
      <div className="mt-8">
        <Markdown>{resource.body}</Markdown>
      </div>
    </main>
  )
}
