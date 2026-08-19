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
import { type ResourceType, resourceTypes } from '@/core/content/meta'
import { adminListResources } from '@/core/content/queries'
import { findSection } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { requireAdmin } from '@/lib/session'
import { firstParam, parsePageParam } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const TYPES = resourceTypes
const STATUSES = ['draft', 'published'] as const

export default async function AdminResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{
    type?: string | string[]
    status?: string | string[]
    page?: string | string[]
  }>
}) {
  await requireAdmin()
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const query = { type: firstParam(sp.type), status: firstParam(sp.status) }
  const type = TYPES.includes(query.type as ResourceType)
    ? (query.type as ResourceType)
    : undefined
  const status = STATUSES.includes(query.status as (typeof STATUSES)[number])
    ? (query.status as (typeof STATUSES)[number])
    : undefined
  const page = parsePageParam(sp.page)

  const [t, result] = await Promise.all([
    getTranslations('admin'),
    adminListResources(locale, { type, status, page }),
  ])
  const { items, total, page: currentPage, pageSize } = result
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const filterQuery = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  }
  const pageHref = (p: number) => ({
    pathname: '/admin/resources',
    query: p > 1 ? { ...filterQuery, page: String(p) } : filterQuery,
  })

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
        <Link
          href={{
            pathname: '/admin/resources',
            query: status ? { status } : undefined,
          }}
        >
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
            <Badge variant={type === item ? 'default' : 'outline'}>
              {item}
            </Badge>
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
                  {/* Admin deliberately lists resources whose section was
                      retired — this is the only place they can be found and
                      fixed — so show the slug rather than a path that no
                      longer resolves. */}
                  {findSection(resource.type)?.path ?? '—'}/{resource.slug}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
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

      {totalPages > 1 ? (
        <nav
          className="mt-4 flex items-center justify-center gap-4"
          aria-label={t('pagination')}
        >
          {currentPage > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(currentPage - 1)}>← {t('prevPage')}</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground tabular-nums">
            {t('pageOf', { page: currentPage, total: totalPages })}
          </span>
          {currentPage < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(currentPage + 1)}>{t('nextPage')} →</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  )
}
