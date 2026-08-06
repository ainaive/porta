import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ConfirmButton } from '@/components/admin/confirm-button'
import { SettingsForm } from '@/components/admin/settings-form'
import { TranslationForm } from '@/components/admin/translation-form'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Link } from '@/i18n/navigation'
import { adminGetResource } from '@/lib/content'
import { deleteResource } from '@/lib/admin-actions'
import type { ResourceType } from '@/lib/resource-meta'
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

  return (
    <main>
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
        <TabsContent value="en" className="mt-4">
          <TranslationForm
            resourceId={resource.id}
            locale="en"
            initial={translations.en ?? null}
          />
        </TabsContent>
        <TabsContent value="zh" className="mt-4">
          <TranslationForm
            resourceId={resource.id}
            locale="zh"
            initial={translations.zh ?? null}
          />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsForm
            resource={{
              id: resource.id,
              type: resource.type as ResourceType,
              slug: resource.slug,
              status: resource.status,
              tags: resource.tags,
              meta: (resource.meta ?? {}) as Record<string, never>,
            }}
          />
          <Separator className="my-8" />
          <ConfirmButton action={deleteAction} confirmLabel={t('confirmDelete')}>
            {t('delete')}
          </ConfirmButton>
        </TabsContent>
      </Tabs>
    </main>
  )
}
