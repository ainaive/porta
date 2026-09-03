import { getTranslations } from 'next-intl/server'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { firstParam } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const [sp, t] = await Promise.all([searchParams, getTranslations('auth')])
  const token = firstParam(sp.token) ?? null

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-[-0.015em]">
            {t('resetTitle')}
          </CardTitle>
          <CardDescription>{t('resetDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token} />
        </CardContent>
      </Card>
    </main>
  )
}
