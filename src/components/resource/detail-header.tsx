import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import type { TranslatedResource } from '@/core/content/queries'

export async function ResourceDetailHeader({
  resource,
}: {
  resource: TranslatedResource
}) {
  const t = await getTranslations('common')

  return (
    <div>
      <h1 className="flex flex-wrap items-center gap-3 text-[clamp(1.75rem,3.5vw,2.375rem)] font-bold tracking-[-0.028em] text-pretty">
        {resource.title}
        {resource.isFallback ? (
          <Badge variant="outline" className="font-normal">
            {t('untranslated')}
          </Badge>
        ) : null}
      </h1>
      {resource.summary ? (
        <p className="mt-3 max-w-[42em] text-[17px] leading-relaxed text-muted-foreground text-pretty">
          {resource.summary}
        </p>
      ) : null}
      {resource.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {resource.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
