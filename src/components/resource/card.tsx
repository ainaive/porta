import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { TranslatedResource } from '@/core/content/queries'
import { findSection, sectionTitleKey } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'

export async function ResourceCard({
  resource,
  showSection = false,
}: {
  resource: TranslatedResource
  /** Name the section on the card. Off by default — inside a section listing
   *  it would repeat the page heading on every row — and on for results that
   *  span sections, where it is the only thing saying what you found. */
  showSection?: boolean
}) {
  const [t, label] = await Promise.all([
    getTranslations('common'),
    getTranslations(),
  ])
  // Public queries drop resources whose section was retired, so this is a
  // backstop rather than an expected state — but a stale row must not take
  // the whole listing down with it.
  const section = findSection(resource.type)
  if (!section) return null

  return (
    <Link
      href={`${section.path}/${resource.slug}`}
      className="group focus-visible:outline-none"
    >
      <Card className="h-full transition-colors group-hover:border-brand-3 group-hover:bg-surface-hover group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardHeader>
          {showSection ? (
            <div className="mb-1 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
              {label(sectionTitleKey(section.key))}
            </div>
          ) : null}
          <CardTitle className="flex items-start justify-between gap-2 text-[15px] font-semibold">
            <span>{resource.title}</span>
            {resource.isFallback ? (
              <Badge variant="outline" className="shrink-0 font-normal">
                {t('untranslated')}
              </Badge>
            ) : null}
          </CardTitle>
          {resource.summary ? (
            <CardDescription className="line-clamp-2 text-[13px] leading-relaxed">
              {resource.summary}
            </CardDescription>
          ) : null}
          {resource.tags.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {resource.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>
      </Card>
    </Link>
  )
}
