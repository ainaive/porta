import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import type { TranslatedResource } from '@/lib/content'

export async function ResourceDetailHeader({
  resource,
}: {
  resource: TranslatedResource
}) {
  const t = await getTranslations('common')

  return (
    <div>
      <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight">
        {resource.title}
        {resource.isFallback ? (
          <Badge variant="outline" className="font-normal">
            {t('untranslated')}
          </Badge>
        ) : null}
      </h1>
      {resource.summary ? (
        <p className="mt-2 text-lg text-muted-foreground">{resource.summary}</p>
      ) : null}
      {resource.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {resource.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
