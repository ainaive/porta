import { getTranslations } from 'next-intl/server'
import { ResourceCard } from '@/components/resource/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ResourceType } from '@/core/content/meta'
import {
  type FacetFilters,
  listFacetCounts,
  listPublished,
  listPublishedTags,
} from '@/core/content/queries'
import {
  getSection,
  metaFieldLabelKey,
  metaFieldOptionLabelKey,
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
  facets = {},
  page,
}: {
  type: ResourceType
  locale: Locale
  q?: string
  tag?: string
  facets?: FacetFilters
  page?: number
}) {
  const section = getSection(type)
  const facetFields = section.facets ?? []
  const [t, label, result, tags, counts] = await Promise.all([
    getTranslations('content'),
    getTranslations(),
    listPublished(type, locale, { q, tag, facets, page }),
    listPublishedTags(type),
    facetFields.length > 0
      ? listFacetCounts(type, facetFields, { q, tag, facets })
      : Promise.resolve({} as Record<string, Record<string, number>>),
  ])
  const { items, total, page: currentPage, pageSize } = result
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  // Preserve the active search, tag and facets across every other link.
  const baseQuery: Record<string, string | string[]> = {
    ...(q ? { q } : {}),
    ...(tag ? { tag } : {}),
    ...Object.fromEntries(
      Object.entries(facets)
        .filter(([, values]) => values.length > 0)
        .map(([field, values]) => [field, [...values]]),
    ),
  }

  /** The query string with one facet value toggled — the chip's own href, so
   *  a click both applies and clears without a form or a client component. */
  const toggledQuery = (field: string, value: string) => {
    const active = facets[field] ?? []
    const next = active.includes(value)
      ? active.filter((v) => v !== value)
      : [...active, value]
    const rest = { ...baseQuery }
    delete rest[field]
    return next.length > 0 ? { ...rest, [field]: next } : rest
  }
  const withoutTag = { ...baseQuery }
  delete withoutTag.tag

  const pageHref = (p: number) => ({
    pathname: section.path,
    query: p > 1 ? { ...baseQuery, page: String(p) } : baseQuery,
  })

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
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

      {facetFields.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3">
          {facetFields.map((name) => {
            const field = section.metaFields.find((f) => f.name === name)
            if (!field) return null
            const active = facets[name] ?? []
            return (
              <div key={name} className="flex flex-wrap items-baseline gap-2">
                <span className="w-20 shrink-0 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                  {label(metaFieldLabelKey(section, field))}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(field.options ?? []).map((option) => {
                    const total = counts[name]?.[option.value] ?? 0
                    // A value nothing carries is not a filter, it is a dead
                    // end — unless it is already applied, in which case
                    // hiding it would strand the reader on a chip they
                    // cannot unclick.
                    if (total === 0 && !active.includes(option.value)) {
                      return null
                    }
                    const optionKey = metaFieldOptionLabelKey(section, option)
                    return (
                      <Link
                        key={option.value}
                        href={{
                          pathname: section.path,
                          query: toggledQuery(name, option.value),
                        }}
                      >
                        <Badge
                          variant={
                            active.includes(option.value)
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {optionKey ? label(optionKey) : option.label}
                          <span className="ml-1.5 font-mono opacity-60">
                            {total}
                          </span>
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href={{
              pathname: section.path,
              query: withoutTag,
            }}
          >
            <Badge variant={tag ? 'outline' : 'default'}>{t('all')}</Badge>
          </Link>
          {tags.map((item) => (
            <Link
              key={item}
              href={{
                pathname: section.path,
                query: { ...baseQuery, tag: item },
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
    </main>
  )
}
