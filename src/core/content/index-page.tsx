import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  moduleIndexPath,
  sectionDescriptionKey,
  sections,
  sectionTitleKey,
} from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/metadata'

// A module with more than one section needs something at its base path. This
// renders the module's own sections from the registry, so adding a section
// makes it appear here with no edit — the point of the whole arrangement.
export function createModuleIndexPage(moduleId: string) {
  return async function ModuleIndexPage() {
    const label = await getTranslations()
    const own = sections.filter((section) => section.moduleId === moduleId)

    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          {label(`${moduleId}.index.title`)}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {label(`${moduleId}.index.description`)}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {own.map((section) => (
            <Link
              key={section.key}
              href={section.path}
              className="group focus-visible:outline-none"
            >
              <Card className="h-full transition-colors group-hover:border-foreground/20 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardHeader>
                  <CardTitle className="text-base">
                    {label(sectionTitleKey(section.key))}
                  </CardTitle>
                  <CardDescription>
                    {label(sectionDescriptionKey(section.key))}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  }
}

// Same split as the listing pages: a module index is crawlable and advertised
// in the sitemap, so it says what it is rather than inheriting the landing's
// title. The path is derived from the nav entry the module's sections hang
// off, so the canonical URL here and the one sitemap.ts publishes are the
// same string.
export function createModuleIndexMetadata(moduleId: string) {
  const path = moduleIndexPath(moduleId)
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: Locale }>
  }): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale })
    const title = t(`${moduleId}.index.title`)
    return {
      title,
      ...pageMetadata({
        title,
        description: t(`${moduleId}.index.description`),
        siteName: t('common.appName'),
        path,
        locale,
      }),
    }
  }
}
