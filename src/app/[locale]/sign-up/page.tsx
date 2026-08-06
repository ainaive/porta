import { getTranslations } from 'next-intl/server'
import { SignUpForm } from '@/components/auth/sign-up-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { findValidInvite, hasAnyUser } from '@/lib/invites'

export const dynamic = 'force-dynamic'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const [{ token }, t] = await Promise.all([
    searchParams,
    getTranslations('auth'),
  ])
  const bootstrap = !(await hasAnyUser())

  let lockedEmail: string | null = null
  let allowed = bootstrap
  if (!bootstrap && token) {
    const invite = await findValidInvite(token)
    if (invite) {
      allowed = true
      lockedEmail = invite.email
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        {allowed ? (
          <>
            <CardHeader>
              <CardTitle>{t('signUpTitle')}</CardTitle>
              <CardDescription>
                {bootstrap ? t('signUpBootstrap') : t('signUpInvited')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpForm
                inviteToken={bootstrap ? undefined : token}
                lockedEmail={lockedEmail}
              />
            </CardContent>
          </>
        ) : (
          <CardHeader>
            <CardTitle>{t('inviteRequiredTitle')}</CardTitle>
            <CardDescription>
              {token ? t('inviteInvalid') : t('inviteMissing')}
            </CardDescription>
          </CardHeader>
        )}
      </Card>
    </main>
  )
}
