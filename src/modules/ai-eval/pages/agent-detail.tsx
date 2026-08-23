import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ResourceDetailHeader } from '@/components/resource/detail-header'
import { Markdown } from '@/components/resource/markdown'
import { Button } from '@/components/ui/button'
import { getPublishedBySlug } from '@/core/content/queries'
import type { Locale } from '@/i18n/routing'
import { requireSession } from '@/lib/session'
import { agentMeta } from '../module'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const resource = await getPublishedBySlug('agent', slug, locale)
  return { title: resource?.title }
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  await requireSession(`/${locale}/evals/agents/${slug}`)

  const resource = await getPublishedBySlug('agent', slug, locale)
  if (!resource) notFound()

  const meta = agentMeta.safeParse(resource.meta).data
  const t = await getTranslations('ai-eval')

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <ResourceDetailHeader resource={resource} />

      {meta?.vendor ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t('vendor')}: {meta.vendor}
        </p>
      ) : null}

      {meta?.docsUrl || (meta?.links.length ?? 0) > 0 ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {meta?.docsUrl ? (
            <Button asChild>
              <a href={meta.docsUrl} target="_blank" rel="noreferrer">
                {t('documentation')}
              </a>
            </Button>
          ) : null}
          {meta?.links.map((link) => (
            <Button key={link.url} asChild variant="outline">
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            </Button>
          ))}
        </div>
      ) : null}

      <div className="mt-8">
        <Markdown>{resource.body}</Markdown>
      </div>
    </div>
  )
}
