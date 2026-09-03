import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import type { TranslatedResource } from '@/core/content/queries'
import {
  metaFieldLabelKey,
  metaFieldOptionLabelKey,
  type ResolvedSection,
} from '@/core/module/derive'
import { Link } from '@/i18n/navigation'

/** The `grouped` layout: the design's two-column rows, a group label and its
 *  blurb on the left, that group's cards on the right.
 *
 *  Groups come from the `select` field the section named in
 *  `listing.groupBy`, in the order its descriptor declares them — not
 *  alphabetically, and not in whatever order the rows happened to arrive.
 *  Ungrouped resources land in a final catch-all rather than vanishing. */
export async function GroupedResources({
  items,
  section,
}: {
  items: TranslatedResource[]
  section: ResolvedSection
}) {
  const listing = section.listing
  if (listing?.kind !== 'grouped') return null
  const field = section.metaFields.find((f) => f.name === listing.groupBy)
  if (!field) return null

  const [t, common, label] = await Promise.all([
    getTranslations('content'),
    getTranslations('common'),
    getTranslations(),
  ])

  const valueOf = (resource: TranslatedResource): string | null => {
    const raw = (resource.meta as Record<string, unknown>)?.[listing.groupBy]
    return typeof raw === 'string' ? raw : null
  }

  const groups = [
    ...(field.options ?? []).map((option) => ({
      key: option.value,
      title: (() => {
        const messageKey = metaFieldOptionLabelKey(section, option)
        return messageKey ? label(messageKey) : option.label
      })(),
      items: items.filter((item) => valueOf(item) === option.value),
    })),
    {
      key: '__ungrouped',
      title: label(metaFieldLabelKey(section, field)),
      items: items.filter((item) => {
        const value = valueOf(item)
        return (
          value === null ||
          !(field.options ?? []).some((option) => option.value === value)
        )
      }),
    },
  ].filter((group) => group.items.length > 0)

  return (
    <div className="mt-8">
      {groups.map((group) => (
        <div
          key={group.key}
          className="grid gap-9 border-t py-8 sm:grid-cols-[minmax(11rem,16.375rem)_minmax(0,1fr)]"
        >
          <h2 className="text-[19px] font-semibold tracking-[-0.012em]">
            {group.title}
          </h2>
          <div className="grid content-start gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(14.375rem,1fr))]">
            {group.items.map((item) => (
              <Link
                key={item.id}
                href={`${section.path}/${item.slug}`}
                className="flex flex-col gap-1.5 border bg-card p-5 transition-colors hover:border-brand-3 hover:bg-surface-hover"
              >
                <span className="text-[14.5px] font-semibold text-brand">
                  {item.title}
                </span>
                <span className="text-[12.5px] leading-relaxed text-muted-foreground text-pretty">
                  {item.summary}
                </span>
                <span className="mt-auto flex items-center gap-2 pt-2">
                  <span className="font-mono text-[10px] tracking-[0.06em] text-faint uppercase">
                    {readingTime(item) ?? t('all')}
                  </span>
                  {item.isFallback ? (
                    <Badge variant="outline">{common('untranslated')}</Badge>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** The card's corner label. Free text on purpose — "8 min read", "Reference"
 *  and "Policy" are all things a doc legitimately is. */
function readingTime(resource: TranslatedResource): string | null {
  const value = (resource.meta as Record<string, unknown>)?.readingTime
  return typeof value === 'string' && value ? value : null
}
