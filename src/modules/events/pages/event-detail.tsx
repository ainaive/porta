import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ResourceDetailHeader } from '@/components/resource/detail-header'
import { Markdown } from '@/components/resource/markdown'
import { Button } from '@/components/ui/button'
import { getPublishedBySlug } from '@/core/content/queries'
import type { Locale } from '@/i18n/routing'
import { requireSession } from '@/lib/session'
import { eventMeta } from '../module'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const resource = await getPublishedBySlug('event', slug, locale)
  return { title: resource?.title }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  await requireSession(`/${locale}/events/${slug}`)

  const resource = await getPublishedBySlug('event', slug, locale)
  if (!resource) notFound()

  const meta = eventMeta.safeParse(resource.meta).data
  const t = await getTranslations('events')

  // Date, time and place read as one line — a session is one thing happening
  // once, not four separate facts.
  const when = [
    meta?.date,
    meta?.time,
    meta?.place,
    meta?.kind ? t(`kinds.${meta.kind}`) : null,
  ].filter(Boolean)

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <ResourceDetailHeader resource={resource} />

      {when.length > 0 ? (
        <p className="mt-3 font-mono text-sm text-muted-foreground">
          {when.join(' · ')}
        </p>
      ) : null}

      <div className="mt-8">
        <Markdown>{resource.body}</Markdown>
      </div>

      {meta?.registerUrl ? (
        <div className="mt-8 border-t pt-6">
          <Button asChild>
            <a href={meta.registerUrl} target="_blank" rel="noreferrer">
              {t('register')}
            </a>
          </Button>
        </div>
      ) : null}
    </main>
  )
}
