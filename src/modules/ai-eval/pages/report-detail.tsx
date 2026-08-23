import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ResourceDetailHeader } from '@/components/resource/detail-header'
import { Markdown } from '@/components/resource/markdown'
import { Button } from '@/components/ui/button'
import { getPublishedBySlug } from '@/core/content/queries'
import type { Locale } from '@/i18n/routing'
import { requireSession } from '@/lib/session'
import { reportMeta } from '../module'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const resource = await getPublishedBySlug('report', slug, locale)
  // Gated behind requireSession, so this is a tab title and an in-app share
  // rather than anything a crawler reads — sitemap.ts deliberately omits
  // detail pages. The summary costs nothing: getPublishedBySlug is
  // React-cached, so the page below reuses this very query.
  return {
    title: resource?.title,
    description: resource?.summary || undefined,
  }
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  await requireSession(`/${locale}/evals/reports/${slug}`)

  const resource = await getPublishedBySlug('report', slug, locale)
  if (!resource) notFound()

  const meta = reportMeta.safeParse(resource.meta).data
  const t = await getTranslations('ai-eval')

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <ResourceDetailHeader resource={resource} />

      {meta?.subject ? (
        <p className="mt-3 text-sm text-muted-foreground">{meta.subject}</p>
      ) : null}

      <div className="mt-8">
        <Markdown>{resource.body}</Markdown>
      </div>

      {meta?.sourceUrl ? (
        <div className="mt-8 border-t pt-6">
          <Button asChild variant="outline">
            <a href={meta.sourceUrl} target="_blank" rel="noreferrer">
              {t('documentation')}
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
