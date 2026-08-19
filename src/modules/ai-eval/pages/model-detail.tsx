import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ResourceDetailHeader } from '@/components/resource/detail-header'
import { Markdown } from '@/components/resource/markdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPublishedBySlug } from '@/core/content/queries'
import type { Locale } from '@/i18n/routing'
import { requireSession } from '@/lib/session'
import { modelApiMeta } from '../module'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const resource = await getPublishedBySlug('model_api', slug, locale)
  return { title: resource?.title }
}

export default async function ModelApiDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  await requireSession(`/${locale}/models/${slug}`)

  const resource = await getPublishedBySlug('model_api', slug, locale)
  if (!resource) notFound()

  const meta = modelApiMeta.safeParse(resource.meta).data
  const t = await getTranslations('ai-eval')

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <ResourceDetailHeader resource={resource} />

      {meta?.endpoint || meta?.provider ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t('endpoint')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {meta.provider ? (
              <div className="text-muted-foreground">
                {t('provider')}: {meta.provider}
              </div>
            ) : null}
            {meta.endpoint ? (
              <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2">
                {meta.endpoint}
              </code>
            ) : null}
          </CardContent>
        </Card>
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
    </main>
  )
}
