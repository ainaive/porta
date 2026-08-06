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
  const { token } = await searchParams
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
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        {allowed ? (
          <>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                {bootstrap
                  ? 'You are setting up Porta — the first account becomes the administrator.'
                  : 'You have been invited to Porta.'}
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
            <CardTitle>Invitation required</CardTitle>
            <CardDescription>
              {token
                ? 'This invitation link is invalid, expired, or already used. Ask an administrator for a new one.'
                : 'Sign-up is invite-only. Ask an administrator for an invitation link.'}
            </CardDescription>
          </CardHeader>
        )}
      </Card>
    </main>
  )
}
