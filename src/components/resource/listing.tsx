import { getTranslations } from 'next-intl/server'
import { ResourceCard } from '@/components/resource/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ResourceType } from '@/core/content/meta'
import { listPublished, listPublishedTags } from '@/core/content/queries'
import {
  getSection,
  sectionDescriptionKey,
  sectionTitleKey,
} from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

// One listing for every section in every module: the module supplies the
// path and the labels, the platform supplies search, tags and pagination.
export async function ResourceListing({
  type,
  locale,
  q,
  tag,
  page,
}: {
  type: ResourceType
  locale: Locale
  q?: string
  tag?: string
  page?: number
}) {
  const section = getSection(type)
  const [t, label, result, tags] = await Promise.all([
    getTranslations('content'),
    getTranslations(),
    listPublished(type, locale, { q, tag, page }),
    listPublishedTags(type),
  ])
  const { items, total, page: currentPage, pageSize } = result
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  // Preserve the active search/tag across page links.
  const baseQuery = { ...(q ? { q } : {}), ...(tag ? { tag } : {}) }
  const pageHref = (p: number) => ({
    pathname: section.path,
    query: p > 1 ? { ...baseQuery, page: String(p) } : baseQuery,
  })

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {label(sectionTitleKey(type))}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {label(sectionDescriptionKey(type))}
          </p>
        </div>
        <form action={`/${locale}${section.path}`} method="get">
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t('searchPlaceholder')}
            className="w-56"
          />
          {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        </form>
      </div>

      {tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link href={{ pathname: section.path, query: q ? { q } : undefined }}>
            <Badge variant={tag ? 'outline' : 'default'}>{t('all')}</Badge>
          </Link>
          {tags.map((item) => (
            <Link
              key={item}
              href={{
                pathname: section.path,
                query: { tag: item, ...(q ? { q } : {}) },
              }}
            >
              <Badge variant={tag === item ? 'default' : 'outline'}>
                {item}
              </Badge>
            </Link>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          className="mt-10 flex items-center justify-center gap-4"
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
    </div>
  )
}
