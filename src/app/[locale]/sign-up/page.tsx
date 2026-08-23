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
import { firstParam } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const [sp, t, common] = await Promise.all([
    searchParams,
    getTranslations('auth'),
    getTranslations('common'),
  ])
  const token = firstParam(sp.token)
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
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        {allowed ? (
          <>
            <CardHeader>
              <CardTitle>{t('signUpTitle')}</CardTitle>
              <CardDescription>
                {t(bootstrap ? 'signUpBootstrap' : 'signUpInvited', {
                  appName: common('appName'),
                })}
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
    </div>
  )
}
