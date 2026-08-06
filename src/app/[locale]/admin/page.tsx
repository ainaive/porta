import { and, count, gt, isNull } from 'drizzle-orm'
import { getTranslations } from 'next-intl/server'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { db } from '@/db'
import { invites, resources, user } from '@/db/schema'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  const [byTypeStatus, [users], [activeInvites]] = await Promise.all([
    db
      .select({
        type: resources.type,
        status: resources.status,
        count: count(),
      })
      .from(resources)
      .groupBy(resources.type, resources.status),
    db.select({ count: count() }).from(user),
    db
      .select({ count: count() })
      .from(invites)
      .where(and(isNull(invites.usedAt), gt(invites.expiresAt, new Date()))),
  ])

  const published = byTypeStatus
    .filter((r) => r.status === 'published')
    .reduce((sum, r) => sum + r.count, 0)
  const drafts = byTypeStatus
    .filter((r) => r.status === 'draft')
    .reduce((sum, r) => sum + r.count, 0)

  const stats = [
    { label: t('published'), value: published },
    { label: t('draft'), value: drafts },
    { label: t('users'), value: users.count },
    { label: t('activeInvites'), value: activeInvites.count },
  ]

  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('dashboard')}
      </h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {stat.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </main>
  )
}
