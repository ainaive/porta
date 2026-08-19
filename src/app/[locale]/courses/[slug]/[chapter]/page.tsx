import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Markdown } from '@/components/resource/markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPublishedBySlug, listChapters } from '@/core/content/queries'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function CourseChapterPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string; chapter: string }>
}) {
  const { locale, slug, chapter } = await params
  await requireSession(`/${locale}/courses/${slug}/${chapter}`)

  // Strict digits only: parseInt('3abc') is 3, which would render chapter 3
  // at a non-canonical URL. Positions are 1..n, so no leading zeros either.
  if (!/^[1-9]\d*$/.test(chapter)) notFound()
  const position = Number.parseInt(chapter, 10)

  const course = await getPublishedBySlug('course', slug, locale)
  if (!course) notFound()

  const chapters = await listChapters(course.id, locale)
  const current = chapters.find((c) => c.position === position)
  if (!current) notFound()

  const index = chapters.indexOf(current)
  const previous = chapters[index - 1]
  const next = chapters[index + 1]

  const [t, tCommon] = await Promise.all([
    getTranslations('help'),
    getTranslations('common'),
  ])

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href={`/courses/${slug}`}
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
            <Link href={`/courses/${slug}/${previous.position}`}>
              ← {t('previousChapter')}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button asChild>
            <Link href={`/courses/${slug}/${next.position}`}>
              {t('nextChapter')} →
            </Link>
          </Button>
        ) : null}
      </div>
    </main>
  )
}
