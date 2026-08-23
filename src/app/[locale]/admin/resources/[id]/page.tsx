import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ConfirmButton } from '@/components/admin/confirm-button'
import { SettingsForm } from '@/components/admin/settings-form'
import { TranslationForm } from '@/components/admin/translation-form'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { adminGetResource } from '@/core/content/queries'
import { findSection } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import { deleteResource } from '@/lib/admin-actions'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const data = await adminGetResource(id)
  if (!data) notFound()

  const t = await getTranslations('admin')
  const { resource, translations } = data
  const deleteAction = deleteResource.bind(null, resource.id)
  // A row whose type is no longer registered still has to be editable, so
  // the meta fields simply collapse to none rather than crashing the page.
  const section = findSection(resource.type)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translations.en?.title ?? translations.zh?.title ?? t('untitled')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {resource.type} · {resource.slug}
          </p>
        </div>
        {resource.type === 'course' ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/resources/${resource.id}/chapters`}>
              {t('manageChapters')}
            </Link>
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="en" className="mt-6">
        <TabsList>
          <TabsTrigger value="en">{t('englishTab')}</TabsTrigger>
          <TabsTrigger value="zh">{t('chineseTab')}</TabsTrigger>
          <TabsTrigger value="settings">{t('settingsTab')}</TabsTrigger>
        </TabsList>
        {/* forceMount + CSS-hide: unmounting the inactive panel would drop
            any draft typed there when switching tabs. */}
        <TabsContent
          value="en"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <TranslationForm
            resourceId={resource.id}
            locale="en"
            initial={translations.en ?? null}
          />
        </TabsContent>
        <TabsContent
          value="zh"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <TranslationForm
            resourceId={resource.id}
            locale="zh"
            initial={translations.zh ?? null}
          />
        </TabsContent>
        <TabsContent
          value="settings"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <SettingsForm
            resource={{
              id: resource.id,
              slug: resource.slug,
              status: resource.status,
              tags: resource.tags,
              meta: (resource.meta ?? {}) as Record<string, unknown>,
            }}
            moduleId={section?.moduleId ?? ''}
            metaFields={section?.metaFields ?? []}
          />
          <Separator className="my-8" />
          <ConfirmButton
            action={deleteAction}
            confirmLabel={t('confirmDelete')}
          >
            {t('delete')}
          </ConfirmButton>
        </TabsContent>
      </Tabs>
    </div>
  )
}
