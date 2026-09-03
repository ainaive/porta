import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Link } from '@/i18n/navigation'
import { requireAdmin } from '@/lib/session'
import { StepTranslationForm } from '@/modules/handbook/components/step-translation-form'
import { adminListSteps } from '@/modules/handbook/steps'

export const dynamic = 'force-dynamic'

export default async function AdminStepEditPage({
  params,
}: {
  params: Promise<{ id: string; stepId: string }>
}) {
  await requireAdmin()
  const { id, stepId } = await params
  const steps = await adminListSteps(id)
  const entry = steps.find((c) => c.step.id === stepId)
  if (!entry) notFound()

  const t = await getTranslations('admin')

  return (
    <main>
      <Link
        href={`/admin/resources/${id}/steps`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t('steps')}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        #{entry.step.position} ·{' '}
        {entry.translations.en?.title ??
          entry.translations.zh?.title ??
          t('noTranslation')}
      </h1>

      <Tabs defaultValue="en" className="mt-6">
        <TabsList>
          <TabsTrigger value="en">{t('englishTab')}</TabsTrigger>
          <TabsTrigger value="zh">{t('chineseTab')}</TabsTrigger>
        </TabsList>
        {/* forceMount + CSS-hide: unmounting the inactive panel would drop
            any draft typed there when switching tabs. */}
        <TabsContent
          value="en"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <StepTranslationForm
            stepId={stepId}
            locale="en"
            initial={entry.translations.en ?? null}
          />
        </TabsContent>
        <TabsContent
          value="zh"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <StepTranslationForm
            stepId={stepId}
            locale="zh"
            initial={entry.translations.zh ?? null}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
