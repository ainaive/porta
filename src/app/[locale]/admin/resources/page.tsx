import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { adminListResources } from '@/lib/content'
import { sectionForType, type ResourceType } from '@/lib/resource-meta'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

const TYPES = ['tool', 'course', 'video', 'model_api'] as const
const STATUSES = ['draft', 'published'] as const

export default async function AdminResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  await requireAdmin()
  const [{ locale }, query] = await Promise.all([params, searchParams])
  const type = TYPES.includes(query.type as ResourceType)
    ? (query.type as ResourceType)
    : undefined
  const status = STATUSES.includes(query.status as (typeof STATUSES)[number])
    ? (query.status as (typeof STATUSES)[number])
    : undefined

  const [t, items] = await Promise.all([
    getTranslations('admin'),
    adminListResources(locale, { type, status }),
  ])

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('resources')}
        </h1>
        <Button asChild size="sm">
          <Link href="/admin/resources/new">{t('newResource')}</Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={{ pathname: '/admin/resources', query: status ? { status } : undefined }}>
          <Badge variant={type ? 'outline' : 'default'}>{t('all')}</Badge>
        </Link>
        {TYPES.map((item) => (
          <Link
            key={item}
            href={{
              pathname: '/admin/resources',
              query: { type: item, ...(status ? { status } : {}) },
            }}
          >
            <Badge variant={type === item ? 'default' : 'outline'}>{item}</Badge>
          </Link>
        ))}
        <span className="mx-2 text-muted-foreground">·</span>
        {STATUSES.map((item) => (
          <Link
            key={item}
            href={{
              pathname: '/admin/resources',
              query: { status: item, ...(type ? { type } : {}) },
            }}
          >
            <Badge variant={status === item ? 'default' : 'outline'}>
              {t(item)}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('titleColumn')}</TableHead>
              <TableHead>{t('type')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('slug')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((resource) => (
              <TableRow key={resource.id}>
                <TableCell>
                  <Link
                    href={`/admin/resources/${resource.id}`}
                    className="font-medium hover:underline"
                  >
                    {resource.title || (
                      <span className="text-muted-foreground italic">
                        {t('untitled')}
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {resource.type}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      resource.status === 'published' ? 'default' : 'outline'
                    }
                  >
                    {t(resource.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  /{sectionForType[resource.type as ResourceType]}/{resource.slug}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  —
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
