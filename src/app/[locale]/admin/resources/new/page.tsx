import { getTranslations } from 'next-intl/server'
import { CreateResourceForm } from '@/components/admin/create-resource-form'
import { resourceTypes } from '@/lib/resource-meta'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function NewResourcePage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('newResource')}
      </h1>
      <div className="mt-6">
        <CreateResourceForm types={resourceTypes} />
      </div>
    </main>
  )
}
