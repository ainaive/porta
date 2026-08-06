import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { SignInForm } from '@/components/auth/sign-in-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function SignInPage() {
  const t = await getTranslations('auth')

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('signInTitle')}</CardTitle>
          <CardDescription>{t('signInDescription')}</CardDescription>
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
