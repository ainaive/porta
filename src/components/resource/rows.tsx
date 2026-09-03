import { getTranslations } from 'next-intl/server'
import { StatusBadge } from '@/components/resource/status-badge'
import { Badge } from '@/components/ui/badge'
import type { TranslatedResource } from '@/core/content/queries'
import {
  metaFieldOptionLabelKey,
  type ResolvedSection,
} from '@/core/module/derive'
import { Link } from '@/i18n/navigation'

/** The value of one `select` meta field on a resource, already translated —
 *  or null when the field is unset or carries something its descriptor does
 *  not offer. Every layout that shows a facet value goes through here, so a
 *  raw enum can never reach a page. */
export async function metaLabel(
  section: ResolvedSection,
  resource: TranslatedResource,
  fieldName: string,
): Promise<string | null> {
  const field = section.metaFields.find((f) => f.name === fieldName)
  const value = (resource.meta as Record<string, unknown>)?.[fieldName]
  if (!field || typeof value !== 'string') return null
  const option = field.options?.find((o) => o.value === value)
  if (!option) return null
  const key = metaFieldOptionLabelKey(section, option)
  if (!key) return option.label
  const label = await getTranslations()
  return label(key)
}

/** One row of the `table` layout.
 *
 *  Real `<tr>`/`<td>` rather than a grid of divs: a catalog people scan and
 *  compare is tabular data, so the row gets a row role, the columns get
 *  headers, and a screen reader can say which column it is reading. */
export async function ResourceRow({
  resource,
  section,
}: {
  resource: TranslatedResource
  section: ResolvedSection
}) {
  const [common, category] = await Promise.all([
    getTranslations('common'),
    metaLabel(section, resource, 'category'),
  ])

  return (
    <tr className="border-b transition-colors last:border-b-0 hover:bg-surface-hover">
      <td className="px-5 py-4.5 align-top">
        <Link
          href={`${section.path}/${resource.slug}`}
          className="text-[15px] font-semibold text-pretty hover:text-brand"
        >
          {resource.title}
        </Link>
        {category ? (
          <div className="mt-1.5 font-mono text-[11px] text-faint">
            {category}
          </div>
        ) : null}
      </td>
      <td className="px-5 py-4.5 align-top text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
        {resource.summary}
      </td>
      <td className="px-5 py-4.5 align-top">
        <div className="flex flex-wrap items-start gap-1.5">
          <StatusBadge resource={resource} />
          {resource.isFallback ? (
            <Badge variant="outline">{common('untranslated')}</Badge>
          ) : null}
          {resource.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="font-mono text-[10.5px] text-faint">
              {tag}
            </span>
          ))}
        </div>
      </td>
    </tr>
  )
}
