import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Markdown } from '@/components/resource/markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPublishedBySlug } from '@/core/content/queries'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { requireSession } from '@/lib/session'
import { listSteps } from '../steps'

export default async function CourseStepPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string; step: string }>
}) {
  const { locale, slug, step } = await params
  await requireSession(`/${locale}/start/${slug}/${step}`)

  // Strict digits only: parseInt('3abc') is 3, which would render step 3
  // at a non-canonical URL. Positions are 1..n, so no leading zeros either.
  if (!/^[1-9]\d*$/.test(step)) notFound()
  const position = Number.parseInt(step, 10)

  const course = await getPublishedBySlug('track', slug, locale)
  if (!course) notFound()

  const steps = await listSteps(course.id, locale)
  const current = steps.find((c) => c.position === position)
  if (!current) notFound()

  const index = steps.indexOf(current)
  const previous = steps[index - 1]
  const next = steps[index + 1]

  const [t, tCommon] = await Promise.all([
    getTranslations('handbook'),
    getTranslations('common'),
  ])

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href={`/start/${slug}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {course.title}
      </Link>

      <h1 className="mt-4 flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight">
        <span className="text-muted-foreground">{current.position}.</span>
        {current.title}
        {current.isFallback ? (
          <Badge variant="outline" className="font-normal">
            {tCommon('untranslated')}
          </Badge>
        ) : null}
      </h1>

      <div className="mt-6">
        <Markdown>{current.body}</Markdown>
      </div>

      <div className="mt-10 flex justify-between gap-4 border-t pt-6">
        {previous ? (
          <Button asChild variant="outline">
            <Link href={`/start/${slug}/${previous.position}`}>
              ← {t('previousStep')}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button asChild>
            <Link href={`/start/${slug}/${next.position}`}>
              {t('nextStep')} →
            </Link>
          </Button>
        ) : null}
      </div>
    </main>
  )
}
