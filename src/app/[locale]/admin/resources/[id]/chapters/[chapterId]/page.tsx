import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ChapterTranslationForm } from '@/components/admin/chapter-translation-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Link } from '@/i18n/navigation'
import { adminListChapters } from '@/lib/content'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function AdminChapterEditPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>
}) {
  await requireAdmin()
  const { id, chapterId } = await params
  const chapters = await adminListChapters(id)
  const entry = chapters.find((c) => c.chapter.id === chapterId)
  if (!entry) notFound()

  const t = await getTranslations('admin')

  return (
    <main>
      <Link
        href={`/admin/resources/${id}/chapters`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t('chapters')}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        #{entry.chapter.position} ·{' '}
        {entry.translations.en?.title ??
          entry.translations.zh?.title ??
          t('noTranslation')}
      </h1>

      <Tabs defaultValue="en" className="mt-6">
        <TabsList>
          <TabsTrigger value="en">{t('englishTab')}</TabsTrigger>
          <TabsTrigger value="zh">{t('chineseTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="en" className="mt-4">
          <ChapterTranslationForm
            chapterId={chapterId}
            locale="en"
            initial={entry.translations.en ?? null}
          />
        </TabsContent>
        <TabsContent value="zh" className="mt-4">
          <ChapterTranslationForm
            chapterId={chapterId}
            locale="zh"
            initial={entry.translations.zh ?? null}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
