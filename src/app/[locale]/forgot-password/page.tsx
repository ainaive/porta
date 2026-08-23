import { getTranslations } from 'next-intl/server'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth')

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('forgotTitle')}</CardTitle>
          <CardDescription>{t('forgotDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
