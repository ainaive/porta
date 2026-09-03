import { getTranslations } from 'next-intl/server'
import { ResourceCard } from '@/components/resource/card'
import { GroupedResources } from '@/components/resource/grouped'
import { ResourceRow } from '@/components/resource/rows'
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

  const layout = section.listing?.kind ?? 'cards'
  const filtering = Boolean(q) || Boolean(tag) || Object.keys(facets).length > 0

  return (
    <main className="mx-auto w-full max-w-[80rem] flex-1 px-7 py-16 sm:px-12">
      <h1 className="text-[clamp(1.75rem,3.5vw,2.375rem)] font-bold tracking-[-0.028em]">
        {label(sectionTitleKey(type))}
      </h1>
      <p className="mt-2.5 max-w-[44em] text-base leading-relaxed text-muted-foreground text-pretty">
        {label(sectionDescriptionKey(type))}
      </p>

      {/* The design's filter block: one bordered panel holding the free-text
          box, the result count, a reset, and a chip row per facet. */}
      <div className="mt-8 flex flex-col gap-3.5 border bg-panel px-5 py-4.5">
        <div className="flex flex-wrap items-center gap-3.5">
          <form
            action={`/${locale}${section.path}`}
            method="get"
            className="flex min-w-[14rem] flex-1 items-center border border-input bg-card"
          >
            <span aria-hidden className="pl-3 font-mono text-xs text-faint">
              /
            </span>
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t('searchPlaceholder')}
              className="h-auto border-0 bg-transparent py-2.5 shadow-none focus-visible:ring-0"
            />
            {tag ? <input type="hidden" name="tag" value={tag} /> : null}
            {Object.entries(facets).flatMap(([field, values]) =>
              values.map((value) => (
                <input
                  key={`${field}-${value}`}
                  type="hidden"
                  name={field}
                  value={value}
                />
              )),
            )}
          </form>
          <span className="font-mono text-[11.5px] whitespace-nowrap text-label">
            {t('showing', { shown: items.length, total })}
          </span>
          {filtering ? (
            <Link
              href={section.path}
              className="font-mono text-[11px] whitespace-nowrap text-brand underline"
            >
              {t('clearFilters')}
            </Link>
          ) : null}
        </div>

        {facetFields.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {facetFields.map((name) => {
              const field = section.metaFields.find((f) => f.name === name)
              if (!field) return null
              const active = facets[name] ?? []
              return (
                <div
                  key={name}
                  className="flex flex-wrap items-baseline gap-2.5"
                >
                  <span className="w-16 shrink-0 pt-1.5 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
                    {label(metaFieldLabelKey(section, field))}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(field.options ?? []).map((option) => {
                      const matches = counts[name]?.[option.value] ?? 0
                      // A value nothing carries is not a filter, it is a dead
                      // end — unless it is already applied, in which case
                      // hiding it would strand the reader on a chip they
                      // cannot unclick.
                      if (matches === 0 && !active.includes(option.value)) {
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
                              {matches}
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
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="w-16 shrink-0 pt-1.5 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
              {t('tags')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Link href={{ pathname: section.path, query: withoutTag }}>
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
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-16 border py-16 text-center text-muted-foreground">
          {t('empty')}
        </p>
      ) : layout === 'table' ? (
        // Scrolls inside its own box rather than making the page scroll
        // sideways on a phone.
        <div className="mt-6 overflow-x-auto border bg-card">
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <thead>
              <tr className="border-b bg-panel font-mono text-[10px] tracking-[0.1em] text-label uppercase">
                <th className="w-[26%] px-5 py-3 font-normal">
                  {t('colName')}
                </th>
                <th className="w-[47%] px-5 py-3 font-normal">
                  {t('colWhat')}
                </th>
                <th className="px-5 py-3 font-normal">{t('colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  section={section}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : layout === 'grouped' ? (
        <GroupedResources items={items} section={section} />
      ) : (
        <div className="mt-6 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(15.5rem,1fr))]">
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
