import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import type { TranslatedResource } from '@/lib/content'
import { type ResourceType, sectionForType } from '@/lib/resource-meta'

export async function ResourceCard({
  resource,
}: {
  resource: TranslatedResource
}) {
  const t = await getTranslations('common')
  const section = sectionForType[resource.type as ResourceType]

  return (
    <Link
      href={`/${section}/${resource.slug}`}
      className="group focus-visible:outline-none"
    >
      <Card className="h-full transition-colors group-hover:border-foreground/20 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardHeader>
          <CardTitle className="flex items-start justify-between gap-2 text-base">
            <span>{resource.title}</span>
            {resource.isFallback ? (
              <Badge variant="outline" className="shrink-0 font-normal">
                {t('untranslated')}
              </Badge>
            ) : null}
          </CardTitle>
          {resource.summary ? (
            <CardDescription className="line-clamp-2">
              {resource.summary}
            </CardDescription>
          ) : null}
          {resource.tags.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {resource.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="font-normal">
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
