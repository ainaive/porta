import { getTranslations } from 'next-intl/server'
import { ResourceCard } from '@/components/resource/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Link } from '@/i18n/navigation'
import { listPublished, listPublishedTags } from '@/lib/content'
import { sectionForType, type ResourceType } from '@/lib/resource-meta'
import type { Locale } from '@/i18n/routing'

export async function ResourceListing({
  type,
  locale,
  q,
  tag,
}: {
  type: ResourceType
  locale: Locale
  q?: string
  tag?: string
}) {
  const section = sectionForType[type]
  const [t, items, tags] = await Promise.all([
    getTranslations('sections'),
    listPublished(type, locale, { q, tag }),
    listPublishedTags(type),
  ])

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t(`${section}.title`)}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t(`${section}.description`)}
          </p>
        </div>
        <form action={`/${locale}/${section}`} method="get">
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
          <Link href={{ pathname: `/${section}`, query: q ? { q } : undefined }}>
            <Badge variant={tag ? 'outline' : 'default'}>{t('all')}</Badge>
          </Link>
          {tags.map((item) => (
            <Link
              key={item}
              href={{
                pathname: `/${section}`,
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
    </main>
  )
}
