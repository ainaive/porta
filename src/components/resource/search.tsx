import { getTranslations } from 'next-intl/server'
import { ResourceCard } from '@/components/resource/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ResourceType } from '@/core/content/meta'
import { searchPublished } from '@/core/content/queries'
import { sections, sectionTitleKey } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

// One box over the whole catalog. Per-section search already existed (ADR
// 0011); what this adds is not having to guess which section a thing is in
// before you can look for it. The section filter is derived from the
// registry, so a new module is searchable and filterable by registering.

export async function ResourceSearch({
  locale,
  q,
  type,
  page,
}: {
  locale: Locale
  q?: string
  type?: ResourceType
  page?: number
}) {
  const [t, label, content] = await Promise.all([
    getTranslations('search'),
    getTranslations(),
    getTranslations('content'),
  ])

  const query = q?.trim() ?? ''
  // An empty query is a prompt, not a dump of the whole catalog: the section
  // listings already exist for browsing, and running the query would put a
  // full scan behind an empty box every crawler and stray link hits.
  const result = query
    ? await searchPublished(locale, { q: query, type, page })
    : null

  const filterHref = (section?: ResourceType) => ({
    pathname: '/search',
    query: { q: query, ...(section ? { type: section } : {}) },
  })
  const pageHref = (p: number) => ({
    pathname: '/search',
    query: {
      q: query,
      ...(type ? { type } : {}),
      ...(p > 1 ? { page: String(p) } : {}),
    },
  })
  const totalPages = result
    ? Math.max(1, Math.ceil(result.total / result.pageSize))
    : 1

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('description')}</p>

      {/* A GET form, so a search is a URL: shareable, bookmarkable, and back
          out of without a client component. */}
      <form
        action={`/${locale}/search`}
        method="get"
        className="mt-6 flex gap-2"
      >
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t('placeholder')}
          aria-label={t('title')}
          className="max-w-md"
          autoFocus
        />
        {type ? <input type="hidden" name="type" value={type} /> : null}
        <Button type="submit">{t('submit')}</Button>
      </form>

      {query ? (
        // A named landmark, not a bare div: these repeat the section names
        // already in the header and footer, so without one a screen reader
        // reaches a third identical list of links with nothing to say which.
        <nav
          aria-label={t('filterLabel')}
          className="mt-6 flex flex-wrap items-center gap-2"
        >
          <Link href={filterHref()}>
            <Badge variant={type ? 'outline' : 'default'}>
              {t('allSections')}
            </Badge>
          </Link>
          {sections.map((section) => (
            <Link key={section.key} href={filterHref(section.key)}>
              <Badge variant={type === section.key ? 'default' : 'outline'}>
                {label(sectionTitleKey(section.key))}
              </Badge>
            </Link>
          ))}
        </nav>
      ) : null}

      {result === null ? (
        <p className="mt-16 text-center text-muted-foreground">{t('prompt')}</p>
      ) : result.total === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">
          {t('noResults', { q: query })}
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted-foreground">
            {t('results', { total: result.total, q: query })}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((resource) => (
              // Results span sections, so each card has to say which one it
              // came from — a title alone does not tell you whether you found
              // a tool or the course about it.
              <ResourceCard key={resource.id} resource={resource} showSection />
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && result ? (
        <nav
          className="mt-10 flex items-center justify-center gap-4"
          aria-label={content('pagination')}
        >
          {result.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(result.page - 1)}>
                ← {content('prevPage')}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground tabular-nums">
            {content('pageOf', { page: result.page, total: totalPages })}
          </span>
          {result.page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(result.page + 1)}>
                {content('nextPage')} →
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  )
}
