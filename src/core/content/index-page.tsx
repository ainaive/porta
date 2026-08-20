import { getTranslations } from 'next-intl/server'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  sectionDescriptionKey,
  sections,
  sectionTitleKey,
} from '@/core/module/derive'
import { Link } from '@/i18n/navigation'

// A module with more than one section needs something at its base path. This
// renders the module's own sections from the registry, so adding a section
// makes it appear here with no edit — the point of the whole arrangement.
export function createModuleIndexPage(moduleId: string) {
  return async function ModuleIndexPage() {
    const label = await getTranslations()
    const own = sections.filter((section) => section.moduleId === moduleId)

    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
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
      </main>
    )
  }
}
