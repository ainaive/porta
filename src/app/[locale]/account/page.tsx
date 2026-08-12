import { getTranslations } from 'next-intl/server'
import { PasswordForm } from '@/components/account/password-form'
import { ProfileForm } from '@/components/account/profile-form'
import { Separator } from '@/components/ui/separator'
import type { Locale } from '@/i18n/routing'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const session = await requireSession(`/${locale}/account`)
  const t = await getTranslations('account')

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t('profileSection')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('emailLabel')}: {session.user.email}
        </p>
        <div className="mt-4">
          <ProfileForm initialName={session.user.name} />
        </div>
      </section>

      <Separator className="my-8" />

      <section>
        <h2 className="text-lg font-semibold">{t('passwordSection')}</h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>
    </main>
  )
}
