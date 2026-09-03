import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { SignInForm } from '@/components/auth/sign-in-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function SignInPage() {
  const [t, common] = await Promise.all([
    getTranslations('auth'),
    getTranslations('common'),
  ])

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-[-0.015em]">
            {t('signInTitle')}
          </CardTitle>
          <CardDescription>
            {t('signInDescription', { appName: common('appName') })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <SignInForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
