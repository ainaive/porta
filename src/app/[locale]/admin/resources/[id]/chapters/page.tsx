import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ConfirmButton } from '@/components/admin/confirm-button'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { adminGetResource } from '@/core/content/queries'
import { Link } from '@/i18n/navigation'
import { requireAdmin } from '@/lib/session'
import { addChapter, deleteChapter, moveChapter } from '@/modules/help/actions'
import { adminListChapters } from '@/modules/help/chapters'

export const dynamic = 'force-dynamic'

export default async function AdminChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const data = await adminGetResource(id)
  if (!data || data.resource.type !== 'course') notFound()

  const [t, chapters] = await Promise.all([
    getTranslations('admin'),
    adminListChapters(id),
  ])
  const courseTitle =
    data.translations.en?.title ?? data.translations.zh?.title ?? t('untitled')

  return (
    <div>
      <Link
        href={`/admin/resources/${id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {courseTitle}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('chapters')}
        </h1>
        <form action={addChapter.bind(null, id)}>
          <Button type="submit" size="sm">
            {t('addChapter')}
          </Button>
        </form>
      </div>

      <div className="mt-6 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>{t('englishTab')}</TableHead>
              <TableHead>{t('chineseTab')}</TableHead>
              <TableHead className="w-56" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {chapters.map(({ chapter, translations }, index) => (
              <TableRow key={chapter.id}>
                <TableCell className="tabular-nums">
                  {chapter.position}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/resources/${id}/chapters/${chapter.id}`}
                    className="hover:underline"
                  >
                    {translations.en?.title ?? (
                      <span className="text-muted-foreground italic">
                        {t('noTranslation')}
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  {translations.zh?.title ?? (
                    <span className="text-muted-foreground italic">
                      {t('noTranslation')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {index > 0 ? (
                      <form action={moveChapter.bind(null, chapter.id, 'up')}>
                        <Button type="submit" size="sm" variant="outline">
                          ↑
                        </Button>
                      </form>
                    ) : null}
                    {index < chapters.length - 1 ? (
                      <form action={moveChapter.bind(null, chapter.id, 'down')}>
                        <Button type="submit" size="sm" variant="outline">
                          ↓
                        </Button>
                      </form>
                    ) : null}
                    <ConfirmButton
                      action={deleteChapter.bind(null, chapter.id)}
                      confirmLabel={t('confirmDelete')}
                    >
                      {t('delete')}
                    </ConfirmButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {chapters.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  —
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
